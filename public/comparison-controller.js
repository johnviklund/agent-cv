import {
  COMPARISON_CONTRACT,
  normalizeComparisonRequest,
  validateComparisonResult,
} from "./comparison-contract.js";
import {
  MAX_COMPARISON_SNAPSHOT_BYTES,
  buildComparisonSnapshot,
  clearComparisonSnapshot,
  fingerprintComparisonRoles,
  persistComparisonSnapshot,
  restoreComparisonSnapshot,
} from "./comparison-state.js";

const CATALOG_DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const EVIDENCE_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const MAX_CATALOG_BYTES = 1_000_000;

export function createComparisonController({
  storage = globalThis.sessionStorage,
  fetchImpl = globalThis.fetch?.bind(globalThis),
  loadCatalog = ({ signal } = {}) => loadPublicComparisonCatalog(fetchImpl, signal),
  endpoint = "/api/compare",
  createAbortController = () => new AbortController(),
  onChange = () => {},
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("Comparison fetch is required.");
  if (typeof loadCatalog !== "function") throw new TypeError("Comparison catalog loader is required.");

  let catalog = null;
  let snapshot = buildComparisonSnapshot();
  let stateRevision = 0;
  let runtime = {
    status: "editing",
    error: null,
    generation: 0,
    abortController: null,
    storageAvailable: true,
  };

  async function initialize() {
    const token = runtime.generation;
    const revision = stateRevision;
    try {
      const restoredCatalog = await resolveCatalog(loadCatalog());
      if (!isCurrent(token)) return getState();
      if (revision === stateRevision) {
        const restored = restoreComparisonSnapshot(storage, snapshotCatalog(restoredCatalog));
        catalog = restoredCatalog;
        snapshot = restored.snapshot;
        runtime.storageAvailable = restored.storageAvailable;
        if (restored.reason !== "empty" && restored.storageAvailable) persist();
      } else {
        const revisedSnapshot = buildComparisonSnapshot({
          ...snapshot,
          catalogDigest: restoredCatalog.digest,
        }, restoredCatalog);
        catalog = restoredCatalog;
        snapshot = revisedSnapshot;
        persist();
      }
      runtime.status = readyStatus(snapshot);
      runtime.error = null;
    } catch {
      if (!isCurrent(token)) return getState();
      if (revision === stateRevision) {
        const restored = restoreComparisonSnapshot(storage);
        snapshot = restored.snapshot;
        runtime.storageAvailable = restored.storageAvailable;
      }
      runtime.status = readyStatus(snapshot);
      runtime.error = comparisonError("catalog_unavailable", "The public evidence catalog is unavailable.");
    }
    emit();
    return getState();
  }

  function setRoles(roles) {
    stateRevision += 1;
    let nextSnapshot;
    try {
      nextSnapshot = buildComparisonSnapshot({
        ...snapshot,
        roles,
      }, catalog || {});
    } catch (error) {
      if (runtime.status === "analyzing") {
        invalidateRequest();
        runtime.status = readyStatus(snapshot);
        runtime.error = null;
        emit();
      }
      throw error;
    }
    if (
      runtime.status === "analyzing"
      && fingerprintComparisonRoles(nextSnapshot.roles) !== fingerprintComparisonRoles(snapshot.roles)
    ) {
      invalidateRequest();
    }
    snapshot = nextSnapshot;
    runtime.error = null;
    runtime.status = readyStatus(snapshot);
    persist();
    emit();
    return getState();
  }

  async function submitComparison(roles = snapshot.roles, { source = "manual", signal } = {}) {
    if (runtime.status === "analyzing") return { status: "busy" };
    if (!["manual", "agent", "webmcp"].includes(source)) {
      return fail("invalid_input", "Comparison source is invalid.");
    }
    if (signal?.aborted) return { status: "superseded" };

    try {
      setRoles(roles);
    } catch (error) {
      return fail("invalid_input", error.message);
    }

    try {
      normalizeComparisonRequest({ roles: snapshot.roles }, catalog?.digest || "");
    } catch (error) {
      return fail("invalid_input", error.message);
    }

    const token = runtime.generation + 1;
    const abortController = createAbortController();
    runtime = {
      ...runtime,
      status: "analyzing",
      error: null,
      generation: token,
      abortController,
    };
    const abortOwnedRequest = () => {
      if (isCurrent(token)) invalidateRequest();
    };
    signal?.addEventListener?.("abort", abortOwnedRequest, { once: true });
    if (signal?.aborted) abortOwnedRequest();
    emit();

    try {
      let currentCatalog;
      try {
        currentCatalog = await resolveCatalog(loadCatalog({ signal: abortController.signal }));
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        throw taggedError("catalog_unavailable", "The public evidence catalog is unavailable.");
      }
      if (!isCurrent(token)) return { status: "superseded" };
      const request = normalizeComparisonRequest({ roles: snapshot.roles }, currentCatalog.digest);

      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({ roles: request.roles.map(({ title, company, description }) => ({
          title,
          ...(company ? { company } : {}),
          description,
        })) }),
      });
      if (!isCurrent(token)) return { status: "superseded" };
      if (!response?.ok) {
        const problem = await readProblem(response);
        throw taggedError("api_error", problem || "The comparison service is unavailable.");
      }

      const responseDigest = response.headers?.get?.("x-comparison-catalog-digest") || "";
      const raw = await response.text();
      if (!isCurrent(token)) return { status: "superseded" };
      if (byteLength(raw) > MAX_COMPARISON_SNAPSHOT_BYTES) {
        throw taggedError("invalid_result", "The comparison result is too large.");
      }

      let result;
      try {
        result = JSON.parse(raw);
      } catch {
        throw taggedError("invalid_result", "The comparison result is invalid.");
      }
      if (
        responseDigest !== currentCatalog.digest
        || (typeof result?.catalogDigest === "string"
          && CATALOG_DIGEST_PATTERN.test(result.catalogDigest)
          && result.catalogDigest !== currentCatalog.digest)
      ) {
        throw taggedError("catalog_skew", "The comparison used a different evidence catalog. Please retry.");
      }
      try {
        validateComparisonResult(result, currentCatalog);
        assertResultRolesMatch(result, request.roles);
      } catch {
        throw taggedError("invalid_result", "The comparison result is invalid.");
      }

      const nextSnapshot = buildComparisonSnapshot({
        catalogDigest: currentCatalog.digest,
        roles: snapshot.roles,
        result,
        resultRoleFingerprint: fingerprintComparisonRoles(snapshot.roles),
      }, currentCatalog);
      catalog = currentCatalog;
      snapshot = nextSnapshot;
      stateRevision += 1;
      runtime.status = "ready";
      runtime.error = null;
      runtime.abortController = null;
      persist();
      emit();
      return { status: "ready", result: cloneJson(snapshot.result) };
    } catch (error) {
      if (!isCurrent(token) || error?.name === "AbortError") return { status: "superseded" };
      runtime.status = readyStatus(snapshot);
      runtime.error = comparisonError(
        error?.comparisonCode || "network_error",
        boundedErrorMessage(error?.message),
      );
      runtime.abortController = null;
      emit();
      return { status: "error", error: cloneJson(runtime.error) };
    } finally {
      signal?.removeEventListener?.("abort", abortOwnedRequest);
    }
  }

  function cancelComparison() {
    if (runtime.status === "analyzing") invalidateRequest();
    runtime.status = readyStatus(snapshot);
    runtime.error = null;
    emit();
    return getState();
  }

  function clearComparison() {
    invalidateRequest();
    stateRevision += 1;
    snapshot = buildComparisonSnapshot({ catalogDigest: catalog?.digest || "" });
    runtime.status = "editing";
    runtime.error = null;
    runtime.storageAvailable = clearComparisonSnapshot(storage) && runtime.storageAvailable;
    emit();
    return getState();
  }

  function selectComparisonCell(selection) {
    stateRevision += 1;
    snapshot = buildComparisonSnapshot({ ...snapshot, selection }, catalog || {});
    persist();
    emit();
    return getState();
  }

  function getState() {
    const resultStale = Boolean(snapshot.result)
      && snapshot.resultRoleFingerprint !== fingerprintComparisonRoles(snapshot.roles);
    return cloneJson({
      status: runtime.status,
      error: runtime.error,
      roles: snapshot.roles,
      result: snapshot.result,
      resultStale,
      selection: snapshot.selection,
      catalogDigest: snapshot.catalogDigest,
      storageAvailable: runtime.storageAvailable,
    });
  }

  function isBusy() {
    return runtime.status === "analyzing";
  }

  function getEvidenceItems() {
    return cloneJson(catalog?.items || []);
  }

  function invalidateRequest() {
    runtime.generation += 1;
    runtime.abortController?.abort();
    runtime.abortController = null;
  }

  function isCurrent(token) {
    return runtime.generation === token;
  }

  function readyStatus(current) {
    if (!current.result) return "editing";
    return current.resultRoleFingerprint === fingerprintComparisonRoles(current.roles)
      ? "ready"
      : "editing";
  }

  function persist() {
    if (!persistComparisonSnapshot(storage, snapshot)) runtime.storageAvailable = false;
  }

  function fail(code, message) {
    runtime.status = readyStatus(snapshot);
    runtime.error = comparisonError(code, boundedErrorMessage(message));
    emit();
    return { status: "error", error: cloneJson(runtime.error) };
  }

  function emit() {
    try {
      onChange(getState());
    } catch {
      // View observers cannot mutate or interrupt the controller state machine.
    }
  }

  return {
    initialize,
    getState,
    getEvidenceItems,
    isBusy,
    setRoles,
    submitComparison,
    cancelComparison,
    clearComparison,
    selectComparisonCell,
  };
}

function snapshotCatalog(catalog) {
  return { catalogDigest: catalog.digest, evidenceIds: catalog.evidenceIds };
}

export async function loadPublicComparisonCatalog(fetchImpl, signal) {
  const response = await fetchImpl("/evidence.json", {
    method: "GET",
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });
  if (!response?.ok) throw new Error("The public evidence catalog is unavailable.");
  const raw = await response.text();
  if (byteLength(raw) > MAX_CATALOG_BYTES) throw new Error("The public evidence catalog is too large.");
  return JSON.parse(raw);
}

async function resolveCatalog(value) {
  return validateCatalog(await value);
}

function validateCatalog(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Comparison catalog is invalid.");
  if (typeof value.digest !== "string" || !CATALOG_DIGEST_PATTERN.test(value.digest)) throw new TypeError("Comparison catalog digest is invalid.");
  if (!Array.isArray(value.items)) throw new TypeError("Comparison catalog items are invalid.");
  const evidenceIds = new Set();
  const items = [];
  for (const item of value.items) {
    if (!item || typeof item !== "object" || Array.isArray(item) || typeof item.id !== "string" || !EVIDENCE_ID_PATTERN.test(item.id)) {
      throw new TypeError("Comparison catalog evidence ID is invalid.");
    }
    if (evidenceIds.has(item.id)) throw new TypeError("Comparison catalog evidence IDs must be unique.");
    evidenceIds.add(item.id);
    if (typeof item.title !== "string" || !item.title.trim() || item.title.length > 240) {
      throw new TypeError("Comparison catalog evidence title is invalid.");
    }
    if (typeof item.text !== "string" || !item.text.trim() || item.text.length > 50_000) {
      throw new TypeError("Comparison catalog evidence text is invalid.");
    }
    if (
      !item.source
      || typeof item.source !== "object"
      || Array.isArray(item.source)
      || !["data/cv.md", "data/overview.md", "data/projects.md"].includes(item.source.path)
      || !Array.isArray(item.source.headingPath)
      || item.source.headingPath.some((part) => typeof part !== "string" || !part.trim() || part.length > 240)
    ) {
      throw new TypeError("Comparison catalog evidence source is invalid.");
    }
    items.push({
      id: item.id,
      title: item.title.trim(),
      text: item.text.trim(),
      source: {
        path: item.source.path,
        headingPath: item.source.headingPath.map((part) => part.trim()),
      },
    });
  }
  return { digest: value.digest, evidenceIds, items };
}

function assertResultRolesMatch(result, requestRoles) {
  if (result.roles.length !== requestRoles.length) throw new TypeError("Comparison result roles do not match.");
  result.roles.forEach((role, index) => {
    if (role.title !== requestRoles[index].title || role.company !== requestRoles[index].company) {
      throw new TypeError("Comparison result roles do not match.");
    }
  });
}

async function readProblem(response) {
  try {
    const raw = await response.text();
    if (byteLength(raw) > 4_000) return "";
    const value = JSON.parse(raw);
    return typeof value?.error === "string" ? value.error.slice(0, 240) : "";
  } catch {
    return "";
  }
}

function comparisonError(code, message) {
  return { code, message };
}

function taggedError(code, message) {
  const error = new Error(message);
  error.comparisonCode = code;
  return error;
}

function boundedErrorMessage(message) {
  return typeof message === "string" && message.trim()
    ? message.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 240)
    : "The comparison service is unavailable.";
}

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}
