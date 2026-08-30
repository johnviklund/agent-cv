import evidenceCatalog from "./data/comparison-evidence.js";
import { COMPARISON_CONTRACT } from "./data/comparison-contract.js";
import { noStoreJson } from "./http.js";
import {
  buildComparisonInstructions,
  buildComparisonProviderInput,
  canonicalizeComparisonDraft,
  ComparisonInputError,
  comparisonStructuredOutputFormat,
  extractStructuredComparison,
  validateComparisonPayload,
} from "./comparison-core.js";

const DEFAULT_COMPARISON_MODEL = "gpt-5.6-luna";
const DEFAULT_COMPARISON_OUTPUT_TOKENS = 8_000;
const DEFAULT_COMPARISON_MONTHLY_CAP = 60;
const DEFAULT_RESPONSE_HEADER_TIMEOUT_MS = 45_000;
const JSON_CONTENT_TYPE = /^application\/json(?:\s*;|$)/i;

export async function handleCompare(
  request,
  env,
  {
    fetchImpl = fetch,
    openAIConnectTimeoutMs = DEFAULT_RESPONSE_HEADER_TIMEOUT_MS,
  } = {},
) {
  const access = validateComparisonAccess(request);
  if (request.method === "OPTIONS") {
    if (!access.allowed || !access.origin) return comparisonError("This browser origin is not allowed.", 403);
    return new Response(null, {
      status: 204,
      headers: comparisonCorsHeaders(access.origin, {
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400",
      }),
    });
  }
  if (request.method !== "POST") return comparisonError("Use POST /api/compare.", 405, { allow: "POST" });

  const clientKey = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  const rateLimit = await useComparisonRateLimit(env, clientKey);
  if (rateLimit === "unavailable") return comparisonError("The comparison service is not fully configured yet.", 503);
  if (rateLimit === "limited") return comparisonError("The comparison service is busy. Please try again shortly.", 429, { "retry-after": "60" });

  if (!access.allowed) return comparisonError("This browser origin is not allowed.", 403);
  if (!JSON_CONTENT_TYPE.test(request.headers.get("content-type") || "")) {
    return comparisonError("Send JSON with content-type application/json.", 415, {}, access.origin);
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > COMPARISON_CONTRACT.limits.maxBodyBytes) {
    return comparisonError("The comparison request is too large.", 413, {}, access.origin);
  }

  let input;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > COMPARISON_CONTRACT.limits.maxBodyBytes) {
      return comparisonError("The comparison request is too large.", 413, {}, access.origin);
    }
    input = validateComparisonPayload(JSON.parse(raw), evidenceCatalog);
  } catch (error) {
    if (error instanceof ComparisonInputError) return comparisonError(error.message, error.status, {}, access.origin);
    return comparisonError("Send valid JSON.", 400, {}, access.origin);
  }

  if (!env.OPENAI_API_KEY) return comparisonError("The comparison service is not configured yet.", 503, {}, access.origin);
  const budget = await reserveComparisonBudget(env);
  if (budget === "unavailable") return comparisonError("The comparison service is not fully configured yet.", 503, {}, access.origin);
  if (budget === "exhausted") return comparisonError("The monthly comparison limit has been reached.", 503, {}, access.origin);

  const model = env.COMPARISON_MODEL || DEFAULT_COMPARISON_MODEL;
  let upstream;
  let providerResponseText;
  try {
    ({ response: upstream, bodyText: providerResponseText } = await fetchComparisonProvider(fetchImpl, "https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        instructions: buildComparisonInstructions(),
        input: [{ role: "user", content: buildComparisonProviderInput(input.roles, evidenceCatalog) }],
        reasoning: { effort: "none" },
        max_output_tokens: boundedComparisonOutputTokens(env.COMPARISON_MAX_OUTPUT_TOKENS),
        text: { format: comparisonStructuredOutputFormat() },
        stream: false,
        background: false,
        store: false,
      }),
    }, request.signal, openAIConnectTimeoutMs));
  } catch (error) {
    if (error?.comparisonAbort === "client") return comparisonError("The comparison request was cancelled.", 499, {}, access.origin);
    if (error?.comparisonAbort === "timeout") return comparisonError("The comparison service timed out. Please try again.", 504, {}, access.origin);
    console.error("Comparison provider request failed");
    return comparisonError("The comparison service is temporarily unavailable.", 502, {}, access.origin);
  }

  if (!upstream.ok) {
    console.error("Comparison provider request failed", upstream.status);
    return comparisonError(
      upstream.status === 429 ? "The comparison service is busy. Please try again shortly." : "The comparison service is temporarily unavailable.",
      upstream.status === 429 ? 429 : 502,
      upstream.status === 429 ? { "retry-after": "60" } : {},
      access.origin,
    );
  }

  try {
    const providerResponse = JSON.parse(providerResponseText);
    const draft = extractStructuredComparison(providerResponse);
    const result = canonicalizeComparisonDraft(draft, input.roles, evidenceCatalog);
    return noStoreJson(result, 200, Object.fromEntries(comparisonCorsHeaders(access.origin, {
        "x-agent-model": model,
        "x-comparison-catalog-digest": evidenceCatalog.digest,
        "access-control-expose-headers": "x-agent-model, x-comparison-catalog-digest",
      })));
  } catch {
    console.error("Comparison provider returned an invalid structured result");
    return comparisonError("The comparison service returned an invalid result. Please try again.", 502, {}, access.origin);
  }
}

export async function reserveComparisonBudget(env, now = new Date()) {
  if (!env.COMPARISON_BUDGET) return "unavailable";
  try {
    const month = now.toISOString().slice(0, 7);
    const id = env.COMPARISON_BUDGET.idFromName(`comparison:${month}`);
    const response = await env.COMPARISON_BUDGET.get(id).fetch("https://budget.internal/reserve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cap: boundedComparisonMonthlyCap(env.COMPARISON_MONTHLY_REQUEST_CAP) }),
    });
    if (!response.ok) return "unavailable";
    return (await response.json()).reserved === true ? "reserved" : "exhausted";
  } catch {
    console.error("Comparison budget reservation failed");
    return "unavailable";
  }
}

function validateComparisonAccess(request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const hasBrowserFetchMetadata = [...request.headers.keys()].some((name) => name.startsWith("sec-fetch-"));
  if (fetchSite === "cross-site" || fetchSite === "same-site") return { allowed: false, origin: null };
  if (origin === "null") return { allowed: false, origin: null };
  if (origin) return { allowed: origin === requestOrigin, origin: origin === requestOrigin ? origin : null };
  if (hasBrowserFetchMetadata) return { allowed: false, origin: null };
  return { allowed: true, origin: null };
}

async function useComparisonRateLimit(env, clientKey) {
  if (!env.COMPARISON_RATE_LIMITER) return "unavailable";
  try {
    const { success } = await env.COMPARISON_RATE_LIMITER.limit({ key: clientKey });
    return success ? "allowed" : "limited";
  } catch {
    console.error("Comparison rate limiter failed");
    return "unavailable";
  }
}

async function readBoundedProviderText(response, signal) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > COMPARISON_CONTRACT.limits.maxProviderResponseBytes) throw new Error("oversized");
  if (!response.body) throw new Error("missing body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let raw = "";
  let complete = false;
  const cancel = () => { reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (signal.aborted) throw new DOMException("Comparison response aborted", "AbortError");
      if (done) break;
      bytes += value.byteLength;
      if (bytes > COMPARISON_CONTRACT.limits.maxProviderResponseBytes) throw new Error("oversized");
      raw += decoder.decode(value, { stream: true });
    }
    complete = true;
    return raw + decoder.decode();
  } finally {
    signal.removeEventListener("abort", cancel);
    if (!complete) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function fetchComparisonProvider(fetchImpl, url, init, clientSignal, timeoutMs) {
  const controller = new AbortController();
  let abortKind = null;
  const abortFromClient = () => {
    abortKind = "client";
    controller.abort();
  };
  if (clientSignal.aborted) abortFromClient();
  else clientSignal.addEventListener("abort", abortFromClient, { once: true });
  const timeout = setTimeout(() => {
    if (!abortKind) abortKind = "timeout";
    controller.abort();
  }, timeoutMs);
  try {
    if (abortKind) throw comparisonAbortError(abortKind);
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    if (abortKind) throw comparisonAbortError(abortKind);
    if (!response.ok) return { response, bodyText: null };
    const bodyText = await readBoundedProviderText(response, controller.signal);
    if (abortKind) throw comparisonAbortError(abortKind);
    return { response, bodyText };
  } catch (error) {
    if (abortKind) throw comparisonAbortError(abortKind);
    throw error;
  } finally {
    clearTimeout(timeout);
    clientSignal.removeEventListener("abort", abortFromClient);
  }
}

function comparisonAbortError(kind) {
  const error = new Error(kind === "client" ? "Comparison cancelled" : "Comparison timed out");
  error.comparisonAbort = kind;
  return error;
}

function boundedComparisonOutputTokens(value) {
  const parsed = Number(value || DEFAULT_COMPARISON_OUTPUT_TOKENS);
  return Number.isFinite(parsed) ? Math.min(8_000, Math.max(2_000, Math.round(parsed))) : DEFAULT_COMPARISON_OUTPUT_TOKENS;
}

function boundedComparisonMonthlyCap(value) {
  const parsed = Number(value || DEFAULT_COMPARISON_MONTHLY_CAP);
  return Number.isFinite(parsed)
    ? Math.min(DEFAULT_COMPARISON_MONTHLY_CAP, Math.max(1, Math.round(parsed)))
    : DEFAULT_COMPARISON_MONTHLY_CAP;
}

function comparisonError(message, status, extraHeaders = {}, origin = null) {
  return noStoreJson(
    { error: message, fallback: "/cv/" },
    status,
    Object.fromEntries(comparisonCorsHeaders(origin, extraHeaders)),
  );
}

function comparisonCorsHeaders(origin, headers = {}) {
  const result = new Headers(headers);
  result.set("vary", "Origin");
  if (origin) result.set("access-control-allow-origin", origin);
  return result;
}
