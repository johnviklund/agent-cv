import { isLikelyBot } from "./chat-core.js";
import { noStoreJson } from "./http.js";

const DEFAULT_RETENTION_DAYS = 90;
const MAX_RETENTION_DAYS = 365;
const MAX_EXPORT_RECORDS = 5_000;
const DEFAULT_EXPORT_PAGE_SIZE = 250;
const MAX_EXPORT_PAGE_SIZE = 500;
const MAX_FEEDBACK_BODY_BYTES = 2_048;
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

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_FEEDBACK_BODY_BYTES) {
    return noStoreJson({ error: "The feedback request is too large." }, 413);
  }

  let input;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_FEEDBACK_BODY_BYTES) {
      return noStoreJson({ error: "The feedback request is too large." }, 413);
    }
    input = JSON.parse(raw);
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

  let conversation;
  try {
    conversation = JSON.parse(existing);
  } catch {
    return noStoreJson({ error: "Conversation turn is unavailable." }, 500);
  }

  const updatedAt = new Date().toISOString();
  const feedback = {
    schemaVersion: 1,
    type: "conversation_feedback",
    turnId,
    rating,
    note: note || null,
    updatedAt,
    expiresAt: expirationDate(env, conversation).toISOString(),
  };
  await putExpiringRecord(env, `feedback:${turnId}`, feedback);
  return noStoreJson({ saved: true });
}

export async function handleAdminConversations(request, env) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (request.method !== "GET") return noStoreJson({ error: "Use GET." }, 405, { allow: "GET" });
  if (!env.ARCHIVE) return noStoreJson({ error: "Conversation storage is not configured." }, 503);

  const url = new URL(request.url);
  const cursor = (url.searchParams.get("cursor") || "").slice(0, 2_048);
  const limit = boundedExportPageSize(url.searchParams.get("limit"));
  const { records, nextCursor } = await readConversationPage(env.ARCHIVE, cursor, limit);
  records.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const body = records.map((record) => JSON.stringify(record)).join("\n") + (records.length ? "\n" : "");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "content-disposition": `attachment; filename="agent-cv-conversations-${date}.jsonl"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-archive-next-cursor": nextCursor,
    },
  });
}

async function readConversationPage(namespace, cursor, limit) {
  const page = await namespace.list({
    prefix: "conversation:",
    cursor: cursor || undefined,
    limit,
  });
  const records = [];
  for (let index = 0; index < page.keys.length; index += 25) {
    const batch = page.keys.slice(index, index + 25);
    const values = await Promise.all(batch.flatMap(({ name }) => {
      const turnId = name.slice("conversation:".length);
      return [namespace.get(name), namespace.get(`feedback:${turnId}`)];
    }));
    for (let valueIndex = 0; valueIndex < values.length; valueIndex += 2) {
      const conversation = parseRecord(values[valueIndex]);
      if (!conversation) continue;
      const feedback = parseRecord(values[valueIndex + 1]);
      records.push(feedback ? mergeFeedback(conversation, feedback) : conversation);
    }
  }
  return {
    records,
    nextCursor: page.list_complete ? "" : page.cursor || "",
  };
}

export async function handleAdminStats(request, env) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (request.method !== "GET") return noStoreJson({ error: "Use GET." }, 405, { allow: "GET" });
  if (!env.ARCHIVE) return noStoreJson({ error: "Conversation storage is not configured." }, 503);

  const [turnResult, resourceResult] = await Promise.all([
    readConversationRecordsWithStatus(env.ARCHIVE),
    readRecordsWithStatus(env.ARCHIVE, "resource:"),
  ]);
  const turns = turnResult.records;
  const resources = resourceResult.records;
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
    truncated: {
      conversations: turnResult.truncated,
      resources: resourceResult.truncated,
    },
  });
}

async function putExpiringRecord(env, key, record) {
  if (!env.ARCHIVE) return;
  const expiresAt = expirationDate(env, record);
  await env.ARCHIVE.put(key, JSON.stringify({ ...record, expiresAt: expiresAt.toISOString() }), {
    expiration: Math.floor(expiresAt.getTime() / 1_000),
  });
}

export async function readConversationRecords(namespace) {
  return (await readConversationRecordsWithStatus(namespace)).records;
}

export async function readConversationRecordsWithStatus(namespace) {
  const [turnResult, feedbackResult] = await Promise.all([
    readRecordsWithStatus(namespace, "conversation:"),
    readRecordsWithStatus(namespace, "feedback:"),
  ]);
  const turns = turnResult.records;
  const feedbackRecords = feedbackResult.records;
  const feedbackByTurn = new Map(feedbackRecords.map((feedback) => [feedback.turnId, feedback]));
  return {
    records: turns.map((turn) => {
      const feedback = feedbackByTurn.get(turn.turnId);
      return feedback ? mergeFeedback(turn, feedback) : turn;
    }),
    truncated: turnResult.truncated || feedbackResult.truncated,
  };
}

export async function readRecords(namespace, prefix) {
  return (await readRecordsWithStatus(namespace, prefix)).records;
}

export async function readRecordsWithStatus(namespace, prefix, maxRecords = MAX_EXPORT_RECORDS) {
  const records = [];
  let attempted = 0;
  let cursor;
  let truncated = false;
  do {
    const page = await namespace.list({ prefix, cursor, limit: 1_000 });
    const remaining = page.keys.slice(0, Math.max(0, maxRecords - attempted));
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
    if (attempted >= maxRecords) {
      truncated = !page.list_complete || remaining.length < page.keys.length;
      break;
    }
    if (page.list_complete) break;
    cursor = page.cursor;
  } while (cursor);
  return { records, truncated };
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

function expirationDate(env, record) {
  const explicit = Date.parse(record.expiresAt || "");
  if (Number.isFinite(explicit)) return new Date(explicit);
  const createdAt = Date.parse(record.createdAt || "");
  const start = Number.isFinite(createdAt) ? createdAt : Date.now();
  return new Date(start + retentionDays(env) * 24 * 60 * 60 * 1_000);
}

function mergeFeedback(turn, feedback) {
  return {
    ...turn,
    feedback: {
      rating: feedback.rating,
      note: feedback.note || null,
      updatedAt: feedback.updatedAt,
    },
  };
}

function parseRecord(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function boundedExportPageSize(value) {
  const parsed = Number(value || DEFAULT_EXPORT_PAGE_SIZE);
  return Number.isFinite(parsed)
    ? Math.min(MAX_EXPORT_PAGE_SIZE, Math.max(1, Math.round(parsed)))
    : DEFAULT_EXPORT_PAGE_SIZE;
}

export function countBy(records, field) {
  return Object.fromEntries([...records.reduce((counts, record) => {
    const value = record[field] || "unknown";
    counts.set(value, (counts.get(value) || 0) + 1);
    return counts;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)));
}
