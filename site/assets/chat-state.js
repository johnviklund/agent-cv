export const MAX_REQUEST_MESSAGES = 10;
export const PENDING_PROMPT_KEY = "agent-cv:pending-prompt";
const PENDING_APPLICATION_KEY = "agent-cv:pending-application";

export function applicationSlugFromPath(pathname) {
  return typeof pathname === "string"
    ? pathname.match(/^\/a\/([a-z0-9_-]{10,32})\/?$/i)?.[1]?.toLowerCase() || ""
    : "";
}

export function canAddUserTurn(messages) {
  if (!Array.isArray(messages)) return false;
  return messages.length === 0 || messages.at(-1)?.role === "assistant";
}

export function messagesForRequest(messages, limit = MAX_REQUEST_MESSAGES) {
  if (!Array.isArray(messages) || limit < 1) return [];
  const boundedLimit = Math.max(1, Math.floor(limit));
  const coherentLimit = boundedLimit % 2 === 0 ? boundedLimit - 1 : boundedLimit;
  return messages.slice(-coherentLimit);
}

export function rollbackUnpairedUserTurn(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.at(-1)?.role === "user" ? messages.slice(0, -1) : messages.slice();
}

export function storePendingPrompt(storage, prompt) {
  const normalized = typeof prompt === "string" ? prompt.trim().slice(0, 1_200) : "";
  if (!normalized) return false;

  try {
    storage.setItem(PENDING_PROMPT_KEY, normalized);
    return true;
  } catch {
    return false;
  }
}

export function takePendingPrompt(storage) {
  try {
    const prompt = storage.getItem(PENDING_PROMPT_KEY);
    storage.removeItem(PENDING_PROMPT_KEY);
    return typeof prompt === "string" ? prompt.trim().slice(0, 1_200) : "";
  } catch {
    return "";
  }
}

export function storePendingApplication(storage, slug) {
  const normalized = typeof slug === "string" ? slug.trim().toLowerCase() : "";
  if (!/^[a-z0-9_-]{10,32}$/.test(normalized)) return false;
  try {
    storage.setItem(PENDING_APPLICATION_KEY, normalized);
    return true;
  } catch {
    return false;
  }
}

export function takePendingApplication(storage) {
  try {
    const slug = storage.getItem(PENDING_APPLICATION_KEY);
    storage.removeItem(PENDING_APPLICATION_KEY);
    return typeof slug === "string" && /^[a-z0-9_-]{10,32}$/.test(slug) ? slug : "";
  } catch {
    return "";
  }
}

// Chat and application copy that names the page owner (see readOwner in dom.js).
export function agentLabel(owner) {
  return `${owner.shortName}'s agent`.toLocaleUpperCase(owner.lang);
}

export function busyChatMessage(owner) {
  return `${owner.shortName}'s agent is still answering. Wait for the response before opening role comparison.`;
}

export function applicationTitle(application, owner) {
  return `${application.role} at ${application.company} — ${owner.name}`;
}
