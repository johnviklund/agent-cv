import {
  buildUntrustedTranscript,
  ChatInputError,
  LIMITS,
  logRecord,
  publicErrorMessage,
  validateChatPayload,
} from "./chat-core.js";
import { sanitizeOpenAIResponseStream } from "./openai-stream.js";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "x-content-type-options": "nosniff",
};
const LOG_TTL_SECONDS = 90 * 24 * 60 * 60;
const DEFAULT_OPENAI_MODEL = "gpt-5.6-luna";
const DEFAULT_OPENAI_REASONING_EFFORT = "none";
const OPENAI_REASONING_EFFORTS = new Set(["none", "low", "medium", "high", "xhigh", "max"]);

export async function handleRequest(
  request,
  env,
  context,
  { fetchImpl = fetch, systemPrompt = "" } = {},
) {
  const url = new URL(request.url);

  if (url.pathname === "/api/health") {
    return Response.json({
      ok: true,
      model: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      configured: Boolean(env.OPENAI_API_KEY && env.CHAT_BUDGET),
    }, {
      headers: { "cache-control": "no-store", "access-control-allow-origin": "*", "x-content-type-options": "nosniff" },
    });
  }

  if (url.pathname === "/api/contact") {
    return Response.json({ email: env.CONTACT_EMAIL || null }, {
      headers: { "cache-control": "public, max-age=300" },
    });
  }

  if (url.pathname === "/api/ask") {
    return handleAsk(request, env, context, { fetchImpl, systemPrompt });
  }

  return env.ASSETS.fetch(request);
}

export async function handleAsk(
  request,
  env,
  context,
  { fetchImpl = fetch, systemPrompt = "" } = {},
) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400",
      },
    });
  }

  if (request.method !== "POST") {
    return jsonError("Use POST /api/ask.", 405, { allow: "POST" });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > LIMITS.maxBodyBytes) {
    return jsonError("The request is too large.", 413);
  }

  const clientKey = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]
    || "unknown";
  if (env.CHAT_RATE_LIMITER) {
    const { success } = await env.CHAT_RATE_LIMITER.limit({ key: clientKey });
    if (!success) return jsonError(publicErrorMessage(429), 429, { "retry-after": "60" });
  }

  let input;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > LIMITS.maxBodyBytes) {
      return jsonError("The request is too large.", 413);
    }
    input = validateChatPayload(JSON.parse(raw));
  } catch (error) {
    if (error instanceof ChatInputError) return jsonError(error.message, error.status);
    return jsonError("Send valid JSON.", 400);
  }

  if (!env.OPENAI_API_KEY) {
    return jsonError("The chat service is not configured yet. The full CV remains available.", 503);
  }

  const budget = await reserveMonthlyBudget(env);
  if (budget === "unavailable") {
    return jsonError("The chat service is not fully configured yet. The full CV remains available.", 503);
  }
  if (budget === "exhausted") {
    return jsonError("The monthly chat limit has been reached. The full CV remains available.", 503);
  }

  const question = input.messages.at(-1).content;
  const record = logRecord({ question, sessionId: input.sessionId, source: input.source, request });
  if (env.LOGS) {
    context.waitUntil(storeLog(env, record));
  }

  const model = env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  let upstream;
  try {
    upstream = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        instructions: systemPrompt,
        input: [{
          role: "user",
          content: buildUntrustedTranscript(input.messages),
        }],
        reasoning: { effort: openAIReasoningEffort(env.OPENAI_REASONING_EFFORT) },
        max_output_tokens: boundedOutputTokens(env.MAX_OUTPUT_TOKENS),
        stream: true,
        store: false,
      }),
    });
  } catch (error) {
    console.error("OpenAI request failed", error);
    return jsonError(publicErrorMessage(503), 502);
  }

  if (!upstream.ok || !upstream.body) {
    console.error("OpenAI request failed", upstream.status);
    return jsonError(publicErrorMessage(upstream.status), upstream.status === 429 ? 429 : 502);
  }

  const publicStream = sanitizeOpenAIResponseStream(upstream.body, (eventType, code) => {
    console.error("OpenAI stream issue", eventType, code);
  });
  return new Response(publicStream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-store",
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
      "x-agent-model": model,
    },
  });
}

async function storeLog(env, record) {
  const id = crypto.randomUUID();
  await env.LOGS.put(`question:${record.createdAt}:${id}`, JSON.stringify(record), {
    expirationTtl: LOG_TTL_SECONDS,
  });
}

export async function reserveMonthlyBudget(env, now = new Date()) {
  if (!env.CHAT_BUDGET) return "unavailable";

  try {
    const month = now.toISOString().slice(0, 7);
    const id = env.CHAT_BUDGET.idFromName(month);
    const response = await env.CHAT_BUDGET.get(id).fetch("https://budget.internal/reserve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cap: boundedMonthlyCap(env.MONTHLY_REQUEST_CAP) }),
    });
    if (!response.ok) return "unavailable";
    const result = await response.json();
    return result.reserved === true ? "reserved" : "exhausted";
  } catch (error) {
    console.error("Budget reservation failed", error);
    return "unavailable";
  }
}

function boundedOutputTokens(value) {
  const parsed = Number(value || 700);
  return Number.isFinite(parsed) ? Math.min(1_200, Math.max(200, Math.round(parsed))) : 700;
}

function openAIReasoningEffort(value) {
  return OPENAI_REASONING_EFFORTS.has(value) ? value : DEFAULT_OPENAI_REASONING_EFFORT;
}

function boundedMonthlyCap(value) {
  const parsed = Number(value || 1_000);
  return Number.isFinite(parsed) ? Math.min(100_000, Math.max(1, Math.round(parsed))) : 1_000;
}

function jsonError(message, status, extraHeaders = {}) {
  return new Response(JSON.stringify({ error: message, fallback: "/cv/" }), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

export class BudgetCounter {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/reserve") {
      return new Response("Not found", { status: 404 });
    }

    let cap;
    try {
      cap = boundedMonthlyCap((await request.json()).cap);
    } catch {
      return new Response("Invalid budget request", { status: 400 });
    }

    const reserved = await this.state.storage.transaction(async (transaction) => {
      const current = Number(await transaction.get("count") || 0);
      if (current >= cap) return false;
      await transaction.put("count", current + 1);
      return true;
    });

    return Response.json({ reserved });
  }
}
