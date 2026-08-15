import {
  buildUntrustedTranscript,
  ChatInputError,
  LIMITS,
  logRecord,
  publicErrorMessage,
  validateChatPayload,
} from "./chat-core.js";
import {
  createConversationRecord,
  handleAdminConversations,
  handleAdminStats,
  handleFeedback,
  storeConversationRecord,
  storeResourceAccess,
} from "./archive.js";
import {
  buildApplicationInstructions,
  handleAdminApplications,
  handlePublicApplication,
  loadApplicationContext,
} from "./applications.js";
import { sanitizeOpenAIResponseStream } from "./openai-stream.js";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "x-content-type-options": "nosniff",
};
const DEFAULT_OPENAI_MODEL = "gpt-5.6-luna";
const DEFAULT_OPENAI_REASONING_EFFORT = "none";
const OPENAI_REASONING_EFFORTS = new Set(["none", "low", "medium", "high", "xhigh", "max"]);
const MAX_ARCHIVED_ANSWER_CHARACTERS = 16_000;
const OBSERVED_RESOURCE_PATHS = new Set([
  "/AGENTS.md",
  "/llms.txt",
  "/cv.md",
  "/overview.md",
  "/projects.md",
  "/repositories.md",
  "/robots.txt",
  "/sitemap.xml",
]);

export async function handleRequest(
  request,
  env,
  context,
  { fetchImpl = fetch, systemPrompt = "" } = {},
) {
  const url = new URL(request.url);
  const adminApplicationMatch = url.pathname.match(/^\/api\/admin\/applications(?:\/([a-z0-9_-]{10,32})\/(revoke))?$/);
  const publicApplicationMatch = url.pathname.match(/^\/api\/application\/([a-z0-9_-]{10,32})$/);
  const applicationPageMatch = url.pathname.match(/^\/a\/([a-z0-9_-]{10,32})\/?$/);

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

  if (url.pathname === "/api/feedback") {
    return handleFeedback(request, env);
  }

  if (url.pathname === "/api/admin/conversations") {
    return handleAdminConversations(request, env);
  }

  if (url.pathname === "/api/admin/stats") {
    return handleAdminStats(request, env);
  }

  if (adminApplicationMatch) {
    return handleAdminApplications(request, env, adminApplicationMatch[1], adminApplicationMatch[2]);
  }

  if (publicApplicationMatch) {
    return handlePublicApplication(request, env, publicApplicationMatch[1]);
  }

  if (url.pathname === "/api/ask") {
    return handleAsk(request, env, context, { fetchImpl, systemPrompt });
  }

  if (applicationPageMatch) {
    const application = await loadApplicationContext(env, applicationPageMatch[1]);
    if (!application) return new Response("This application link has expired or been revoked.", { status: 410 });
    return env.ASSETS.fetch(new Request(new URL("/application/", request.url), request));
  }

  if ((request.method === "GET" || request.method === "HEAD") && OBSERVED_RESOURCE_PATHS.has(url.pathname)) {
    context.waitUntil(storeResourceAccess(env, url.pathname, request).catch((error) => {
      console.error("Resource telemetry failed", error);
    }));
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

  const application = input.applicationSlug
    ? await loadApplicationContext(env, input.applicationSlug)
    : null;
  if (input.applicationSlug && !application) {
    return jsonError("This application link has expired or been revoked.", 410);
  }

  const budget = await reserveMonthlyBudget(env);
  if (budget === "unavailable") {
    return jsonError("The chat service is not fully configured yet. The full CV remains available.", 503);
  }
  if (budget === "exhausted") {
    return jsonError("The monthly chat limit has been reached. The full CV remains available.", 503);
  }

  const model = env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  const question = input.messages.at(-1).content;
  const baseRecord = logRecord({ question, sessionId: input.sessionId, source: input.source, request });
  let archiveRecord = createConversationRecord({
    ...baseRecord,
    turnId: crypto.randomUUID(),
    model,
    applicationSlug: input.applicationSlug,
  });
  let archiveTail = Promise.resolve();
  let archived = false;
  if (env.ARCHIVE) {
    archiveTail = storeConversationRecord(env, archiveRecord).catch((error) => {
      console.error("Conversation archive failed", error);
    });
    context.waitUntil(archiveTail);
  }

  let archivedAnswer = "";
  const finalizeArchive = (outcome) => {
    if (!env.ARCHIVE || archived) return;
    archived = true;
    archiveRecord = {
      ...archiveRecord,
      answer: archivedAnswer,
      outcome,
      updatedAt: new Date().toISOString(),
    };
    archiveTail = archiveTail.then(() => storeConversationRecord(env, archiveRecord)).catch((error) => {
      console.error("Conversation archive update failed", error);
    });
    context.waitUntil(archiveTail);
  };

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
        instructions: `${systemPrompt}${buildApplicationInstructions(application)}`,
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
    finalizeArchive("failed");
    return jsonError(publicErrorMessage(503), 502);
  }

  if (!upstream.ok || !upstream.body) {
    console.error("OpenAI request failed", upstream.status);
    finalizeArchive("failed");
    return jsonError(publicErrorMessage(upstream.status), upstream.status === 429 ? 429 : 502);
  }

  const publicStream = sanitizeOpenAIResponseStream(upstream.body, (eventType, code) => {
    console.error("OpenAI stream issue", eventType, code);
  }, {
    onDelta(delta) {
      archivedAnswer = `${archivedAnswer}${delta}`.slice(0, MAX_ARCHIVED_ANSWER_CHARACTERS);
    },
    onTerminal: finalizeArchive,
  });
  return new Response(publicStream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-store",
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
      "x-agent-model": model,
      "x-conversation-turn-id": archiveRecord.turnId,
      "access-control-expose-headers": "x-agent-model, x-conversation-turn-id",
    },
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
