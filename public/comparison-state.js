import {
  COMPARISON_CONTRACT,
  validateComparisonResult,
} from "./comparison-contract.js";

export const COMPARISON_STORAGE_KEY = "agent-cv:role-comparison";
export const COMPARISON_SNAPSHOT_VERSION = 1;
export const MAX_COMPARISON_SNAPSHOT_BYTES = 320_000;

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const RESULT_FINGERPRINT_PATTERN = /^roles:[a-z0-9]{1,80}$/;
const ID_PATTERNS = {
  rowId: /^row_[0-9]{2}$/,
  roleId: /^role_[0-9]{2}$/,
  cellId: /^cell_row_[0-9]{2}_role_[0-9]{2}$/,
};

export function resolveSessionStorage(scope = globalThis) {
  try {
    const storage = scope?.sessionStorage;
    return storage && typeof storage.getItem === "function" ? storage : null;
  } catch {
    return null;
  }
}

export function buildComparisonSnapshot(
  {
    catalogDigest = "",
    roles = [],
    result = null,
    resultRoleFingerprint = "",
    selection = emptySelection(),
  } = {},
  { evidenceIds } = {},
) {
  const normalizedDigest = normalizeDigest(catalogDigest);
  const normalizedRoles = normalizeDraftRoles(roles);
  const normalizedResult = normalizeResult(result, normalizedDigest, evidenceIds);
  const normalizedFingerprint = normalizedResult
    ? normalizeFingerprint(resultRoleFingerprint)
    : "";
  const normalizedSelection = normalizedResult
    ? normalizeSelection(selection, normalizedResult)
    : emptySelection();

  return {
    schemaVersion: COMPARISON_SNAPSHOT_VERSION,
    catalogDigest: normalizedDigest,
    roles: normalizedRoles,
    result: normalizedResult,
    resultRoleFingerprint: normalizedFingerprint,
    selection: normalizedSelection,
  };
}

export function restoreComparisonSnapshot(
  storage,
  { catalogDigest = "", evidenceIds } = {},
) {
  const fallback = buildComparisonSnapshot({ catalogDigest });
  if (!storage || typeof storage.getItem !== "function") {
    return { snapshot: fallback, storageAvailable: false, reason: "storage_unavailable" };
  }
  let raw;
  try {
    raw = storage?.getItem?.(COMPARISON_STORAGE_KEY);
  } catch {
    return { snapshot: fallback, storageAvailable: false, reason: "storage_unavailable" };
  }
  if (typeof raw !== "string" || !raw) {
    return { snapshot: fallback, storageAvailable: true, reason: "empty" };
  }
  if (byteLength(raw) > MAX_COMPARISON_SNAPSHOT_BYTES) {
    return { snapshot: fallback, storageAvailable: true, reason: "oversized" };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { snapshot: fallback, storageAvailable: true, reason: "corrupt" };
  }

  let roles = [];
  try {
    roles = normalizeDraftRoles(parsed?.roles);
  } catch {
    return { snapshot: fallback, storageAvailable: true, reason: "corrupt" };
  }

  if (
    !isRecord(parsed)
    || parsed.schemaVersion !== COMPARISON_SNAPSHOT_VERSION
    || parsed.catalogDigest !== catalogDigest
  ) {
    return {
      snapshot: buildComparisonSnapshot({ catalogDigest, roles }),
      storageAvailable: true,
      reason: "stale",
    };
  }

  try {
    return {
      snapshot: buildComparisonSnapshot({
        catalogDigest,
        roles,
        result: parsed.result,
        resultRoleFingerprint: parsed.resultRoleFingerprint,
        selection: parsed.selection,
      }, { evidenceIds }),
      storageAvailable: true,
      reason: "matching",
    };
  } catch {
    return {
      snapshot: buildComparisonSnapshot({ catalogDigest, roles }),
      storageAvailable: true,
      reason: "invalid_result",
    };
  }
}

export function persistComparisonSnapshot(storage, snapshot) {
  try {
    if (!storage || typeof storage.setItem !== "function") return false;
    const whitelisted = buildComparisonSnapshot(snapshot);
    const raw = JSON.stringify(whitelisted);
    if (byteLength(raw) > MAX_COMPARISON_SNAPSHOT_BYTES) return false;
    storage?.setItem?.(COMPARISON_STORAGE_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

export function clearComparisonSnapshot(storage) {
  try {
    if (!storage || typeof storage.removeItem !== "function") return false;
    storage.removeItem(COMPARISON_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function normalizeDraftRoles(value) {
  if (!Array.isArray(value) || value.length > COMPARISON_CONTRACT.limits.maxRoles) {
    throw new TypeError("Comparison roles are invalid.");
  }
  let combined = 0;
  const roles = value.map((role, index) => {
    if (!isRecord(role)) throw new TypeError(`Role ${index + 1} must be an object.`);
    const allowed = new Set(["title", "company", "description"]);
    if (Object.keys(role).some((key) => !allowed.has(key))) {
      throw new TypeError(`Role ${index + 1} contains unsupported fields.`);
    }
    const title = normalizeText(role.title, COMPARISON_CONTRACT.limits.maxTitleCharacters, false);
    const company = normalizeText(role.company ?? "", COMPARISON_CONTRACT.limits.maxCompanyCharacters, false);
    const description = normalizeText(role.description, COMPARISON_CONTRACT.limits.maxDescriptionCharacters, true);
    combined += title.length + company.length + description.length;
    return { title, company, description };
  });
  if (combined > COMPARISON_CONTRACT.limits.maxCombinedRoleCharacters) {
    throw new TypeError("Combined role text is too large.");
  }
  return roles;
}

export function fingerprintComparisonRoles(roles) {
  const input = JSON.stringify(normalizeDraftRoles(roles));
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193) >>> 0;
    second = Math.imul(second ^ code, 0x85ebca6b) >>> 0;
  }
  return `roles:${first.toString(16).padStart(8, "0")}${second.toString(16).padStart(8, "0")}`;
}

// Browsers may copy sessionStorage when a tab is duplicated. The snapshot has
// no cross-tab owner or synchronization token, so each copy diverges after its
// first local edit and never communicates role text to the other tab.

function normalizeResult(result, catalogDigest, evidenceIds) {
  if (result === null || result === undefined) return null;
  validateComparisonResult(result, {
    ...(catalogDigest ? { catalogDigest } : {}),
    ...(evidenceIds ? { evidenceIds } : {}),
  });
  return cloneJson(result);
}

function normalizeSelection(selection, result) {
  if (!isRecord(selection)) return emptySelection();
  const normalized = {};
  for (const [key, pattern] of Object.entries(ID_PATTERNS)) {
    normalized[key] = typeof selection[key] === "string" && pattern.test(selection[key])
      ? selection[key]
      : "";
  }
  if (!normalized.rowId && !normalized.roleId && !normalized.cellId) return normalized;

  const row = result.rows.find(({ id }) => id === normalized.rowId);
  const role = result.roles.find(({ id }) => id === normalized.roleId);
  const cell = row?.cells.find(({ id }) => id === normalized.cellId);
  if (!row || !role || !cell || cell.roleId !== role.id) return emptySelection();
  return normalized;
}

function normalizeDigest(value) {
  if (value === "") return "";
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) {
    throw new TypeError("Comparison catalog digest is invalid.");
  }
  return value;
}

function normalizeFingerprint(value) {
  if (typeof value !== "string" || !RESULT_FINGERPRINT_PATTERN.test(value)) {
    throw new TypeError("Comparison role fingerprint is invalid.");
  }
  return value;
}

function normalizeText(value, maximum, preserveLines) {
  if (typeof value !== "string" || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    throw new TypeError("Comparison role fields must be text.");
  }
  const clean = preserveLines
    ? value.replace(/\r\n?/g, "\n").trim()
    : value.replace(/\s+/g, " ").trim();
  if (clean.length > maximum) throw new TypeError("Comparison role field is too large.");
  return clean;
}

function emptySelection() {
  return { rowId: "", roleId: "", cellId: "" };
}

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
