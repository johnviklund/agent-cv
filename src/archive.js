import { isLikelyBot } from "./chat-core.js";
import { noStoreJson } from "./http.js";

const DEFAULT_RETENTION_DAYS = 90;
const MAX_RETENTION_DAYS = 365;
const MAX_EXPORT_RECORDS = 5_000;
const TURN_ID_PATTERN = /^[a-zA-Z0-9_-]{8,80}$/;
const FEEDBACK_RATINGS = new Set(["helpful", "not_helpful"]);

export function createConversationRecord({ turnId, question, sessionId, source, visitorType, model, applicationSlug = "", now = new Date() }) {
  const createdAt = now.toISOString();
  return {
    schemaVersion: 1,
    type: "conversation_turn",
    turnId,
    createdAt,
    updatedAt: createdAt,
    sessionId,
    source,
    applicationSlug: applicationSlug || null,
    visitorType,
    model,
    question,
    answer: "",
    outcome: "started",
    feedback: null,
  };
}

export async function storeConversationRecord(env, record) {
  return putExpiringRecord(env, `conversation:${record.turnId}`, record);
}

export async function storeResourceAccess(env, path, request, now = new Date()) {
  if (!env.ARCHIVE) return;
  const createdAt = now.toISOString();
  const record = {
    schemaVersion: 1,
    type: "resource_access",
    createdAt,
    path,
    visitorType: isLikelyBot(request.headers.get("user-agent") || "") ? "bot" : "human",
  };
  await putExpiringRecord(env, `resource:${createdAt}:${crypto.randomUUID()}`, record);
}

export async function handleFeedback(request, env) {
  if (request.method !== "POST") return noStoreJson({ error: "Use POST /api/feedback." }, 405, { allow: "POST" });
  if (!env.ARCHIVE) return noStoreJson({ error: "Feedback storage is not configured." }, 503);

  let input;
  try {
    input = await request.json();
  } catch {
    return noStoreJson({ error: "Send valid JSON." }, 400);
  }

  const turnId = typeof input?.turnId === "string" ? input.turnId.trim() : "";
  const rating = typeof input?.rating === "string" ? input.rating.trim() : "";
  const note = typeof input?.note === "string" ? input.note.trim().slice(0, 500) : "";
  if (!TURN_ID_PATTERN.test(turnId) || !FEEDBACK_RATINGS.has(rating)) {
    return noStoreJson({ error: "Send a valid turnId and rating." }, 400);
  }

  const key = `conversation:${turnId}`;
  const existing = await env.ARCHIVE.get(key);
  if (!existing) return noStoreJson({ error: "Conversation turn not found." }, 404);

  let record;
  try {
    record = JSON.parse(existing);
  } catch {
    return noStoreJson({ error: "Conversation turn is unavailable." }, 500);
  }

  const updatedAt = new Date().toISOString();
  record.updatedAt = updatedAt;
  record.feedback = { rating, note: note || null, updatedAt };
  await putExpiringRecord(env, key, record);
  return noStoreJson({ saved: true });
}

export async function handleAdminConversations(request, env) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (request.method !== "GET") return noStoreJson({ error: "Use GET." }, 405, { allow: "GET" });
  if (!env.ARCHIVE) return noStoreJson({ error: "Conversation storage is not configured." }, 503);

  const records = await readRecords(env.ARCHIVE, "conversation:");
  records.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const body = records.map((record) => JSON.stringify(record)).join("\n") + (records.length ? "\n" : "");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "content-disposition": `attachment; filename="agent-cv-conversations-${date}.jsonl"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function handleAdminStats(request, env) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (request.method !== "GET") return noStoreJson({ error: "Use GET." }, 405, { allow: "GET" });
  if (!env.ARCHIVE) return noStoreJson({ error: "Conversation storage is not configured." }, 503);

  const [turns, resources] = await Promise.all([
    readRecords(env.ARCHIVE, "conversation:"),
    readRecords(env.ARCHIVE, "resource:"),
  ]);
  const sessions = new Set(turns.map(({ sessionId }) => sessionId));
  return noStoreJson({
    retentionDays: retentionDays(env),
    conversations: {
      sessions: sessions.size,
      turns: turns.length,
      completed: turns.filter(({ outcome }) => outcome === "completed").length,
      interrupted: turns.filter(({ outcome }) => outcome !== "completed").length,
      helpful: turns.filter(({ feedback }) => feedback?.rating === "helpful").length,
      notHelpful: turns.filter(({ feedback }) => feedback?.rating === "not_helpful").length,
      human: turns.filter(({ visitorType }) => visitorType === "human").length,
      bot: turns.filter(({ visitorType }) => visitorType === "bot").length,
    },
    resources: {
      fetches: resources.length,
      bot: resources.filter(({ visitorType }) => visitorType === "bot").length,
      paths: countBy(resources, "path"),
    },
  });
}

async function putExpiringRecord(env, key, record) {
  if (!env.ARCHIVE) return;
  await env.ARCHIVE.put(key, JSON.stringify(record), {
    expirationTtl: retentionDays(env) * 24 * 60 * 60,
  });
}

export async function readRecords(namespace, prefix) {
  const records = [];
  let attempted = 0;
  let cursor;
  do {
    const page = await namespace.list({ prefix, cursor, limit: 1_000 });
    const remaining = page.keys.slice(0, Math.max(0, MAX_EXPORT_RECORDS - attempted));
    attempted += remaining.length;
    for (let index = 0; index < remaining.length; index += 50) {
      const batch = remaining.slice(index, index + 50);
      const values = await Promise.all(batch.map(({ name }) => namespace.get(name)));
      for (const value of values) {
        if (!value) continue;
        try {
          records.push(JSON.parse(value));
        } catch {
          // Skip corrupt entries without making the complete export unavailable.
        }
      }
    }
    if (attempted >= MAX_EXPORT_RECORDS || page.list_complete) break;
    cursor = page.cursor;
  } while (cursor);
  return records;
}

export async function requireAdmin(request, env) {
  if (!env.ADMIN_API_TOKEN) return noStoreJson({ error: "Admin access is not configured." }, 503);
  const authorization = request.headers.get("authorization") || "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!supplied || !(await secureEqual(supplied, env.ADMIN_API_TOKEN))) {
    return noStoreJson({ error: "Unauthorized." }, 401, { "www-authenticate": "Bearer" });
  }
  return null;
}

async function secureEqual(left, right) {
  const encoder = new TextEncoder();
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < Math.max(leftBytes.length, rightBytes.length); index += 1) {
    difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }
  return difference === 0;
}

function retentionDays(env) {
  const parsed = Number(env.ARCHIVE_RETENTION_DAYS || DEFAULT_RETENTION_DAYS);
  return Number.isFinite(parsed)
    ? Math.min(MAX_RETENTION_DAYS, Math.max(1, Math.round(parsed)))
    : DEFAULT_RETENTION_DAYS;
}

export function countBy(records, field) {
  return Object.fromEntries([...records.reduce((counts, record) => {
    const value = record[field] || "unknown";
    counts.set(value, (counts.get(value) || 0) + 1);
    return counts;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)));
}
