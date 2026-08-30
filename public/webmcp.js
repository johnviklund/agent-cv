import {
  COMPARISON_CONTRACT,
  COMPARISON_COVERAGE_STATES,
  COMPARISON_REASON_CODES,
  normalizeComparisonRequest,
} from "./comparison-contract.js";

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const ROLE_ID_PATTERN = /^role_0[1-3]$/;
const ROW_ID_PATTERN = /^row_(?:0[1-9]|1[0-8])$/;
const CELL_ID_PATTERN = /^cell_row_(?:0[1-9]|1[0-8])_role_0[1-3]$/;
const EVIDENCE_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const COVERAGE = new Set(COMPARISON_COVERAGE_STATES);
const REASON_CODES = new Set([
  ...COMPARISON_REASON_CODES.documented,
  ...COMPARISON_REASON_CODES.transferable,
]);
const STATUS = new Set(["editing", "analyzing", "ready"]);

const EMPTY_INPUT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  properties: {},
});

const COMPARE_INPUT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["roles"],
  properties: {
    roles: {
      type: "array",
      minItems: COMPARISON_CONTRACT.limits.minRoles,
      maxItems: COMPARISON_CONTRACT.limits.maxRoles,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description"],
        properties: {
          title: {
            type: "string",
            minLength: 1,
            maxLength: COMPARISON_CONTRACT.limits.maxTitleCharacters,
          },
          company: {
            type: "string",
            maxLength: COMPARISON_CONTRACT.limits.maxCompanyCharacters,
          },
          description: {
            type: "string",
            minLength: 1,
            maxLength: COMPARISON_CONTRACT.limits.maxDescriptionCharacters,
          },
        },
      },
    },
  },
});

const FOCUS_INPUT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["roleId", "rowId"],
  properties: {
    roleId: { type: "string", pattern: "^role_0[1-3]$" },
    rowId: { type: "string", pattern: "^row_(?:0[1-9]|1[0-8])$" },
  },
});

export async function registerWebMCPTools({
  document = globalThis.document,
  comparison,
  workspace,
  view,
  createAbortController = () => new AbortController(),
} = {}) {
  const registerTool = document?.modelContext?.registerTool;
  if (typeof registerTool !== "function") return unsupportedRegistration();
  if (!hasAdapterDependencies(comparison, workspace, view)) return unsupportedRegistration();

  let registrationController;
  let tools;
  try {
    registrationController = createAbortController();
    tools = createToolDefinitions({ comparison, workspace, view });
    for (const tool of tools) {
      await registerTool.call(document.modelContext, tool, { signal: registrationController.signal });
    }
  } catch {
    registrationController?.abort?.();
    return unsupportedRegistration();
  }
  return {
    supported: true,
    toolNames: tools.map(({ name }) => name),
    cleanup: () => registrationController.abort(),
  };
}

export function createToolDefinitions({ comparison, workspace, view }) {
  return [
    {
      name: "compare_candidate_roles",
      title: "Compare roles (job text is sent to OpenAI)",
      description: "Compare one to three roles with John's published evidence. The supplied job titles, company names, and descriptions are sent to this site's comparison API and OpenAI for analysis before a result is shown on the page.",
      inputSchema: COMPARE_INPUT_SCHEMA,
      execute: (input, options) => safelyExecute(
        "compare_candidate_roles",
        () => compareRoles({ comparison, workspace, view }, input, options),
      ),
    },
    {
      name: "get_comparison_state",
      title: "Get the visible role-comparison index",
      description: "Read a bounded index of the current comparison using only opaque IDs, controlled states, and public evidence identifiers. It excludes job text and generated prose.",
      inputSchema: EMPTY_INPUT_SCHEMA,
      annotations: { readOnlyHint: true },
      execute: (input) => safelyExecute(
        "get_comparison_state",
        () => getComparisonState({ comparison, workspace }, input),
      ),
    },
    {
      name: "focus_comparison_cell",
      title: "Open a comparison cell",
      description: "Open and focus one existing role-and-requirement cell in the visible comparison workspace using its opaque IDs.",
      inputSchema: FOCUS_INPUT_SCHEMA,
      execute: (input) => safelyExecute(
        "focus_comparison_cell",
        () => focusComparisonCell({ comparison, workspace, view }, input),
      ),
    },
    {
      name: "clear_role_comparison",
      title: "Clear the role comparison",
      description: "Cancel any active comparison, clear its transient browser state, and leave the comparison workspace visible.",
      inputSchema: EMPTY_INPUT_SCHEMA,
      execute: (input) => safelyExecute(
        "clear_role_comparison",
        () => clearComparison({ comparison, workspace }, input),
      ),
    },
  ];
}

async function compareRoles({ comparison, workspace, view }, input, options) {
  let roles;
  try {
    roles = normalizeComparisonRequest(input).roles.map(({ title, company, description }) => ({
      title,
      ...(company ? { company } : {}),
      description,
    }));
  } catch {
    return toolError("compare_candidate_roles", "invalid_input", "The WebMCP request is invalid.");
  }

  const signal = options?.signal;
  if (signal !== undefined && !isAbortSignal(signal)) {
    return toolError("compare_candidate_roles", "invalid_input", "The WebMCP request is invalid.");
  }
  if (signal?.aborted) return abortedResult("compare_candidate_roles");
  const opened = openComparisonWorkspace(workspace, "compare_candidate_roles");
  if (opened) return opened;

  let aborted = false;
  const abort = () => {
    aborted = true;
    comparison.cancelComparison();
  };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const outcome = await comparison.submitComparison(roles, { source: "webmcp" });
    if (aborted || signal?.aborted) return abortedResult("compare_candidate_roles");
    if (outcome?.status === "busy") {
      return toolError("compare_candidate_roles", "comparison_busy", "A role comparison is already in progress.");
    }
    if (outcome?.status !== "ready") {
      return toolError("compare_candidate_roles", "comparison_failed", "The role comparison could not be completed.");
    }
    await Promise.resolve();
    view.focusComparisonResult();
    return semanticState("compare_candidate_roles", comparison.getState(), workspace.getMode(), knownEvidenceIds(comparison));
  } finally {
    signal?.removeEventListener("abort", abort);
  }
}

function getComparisonState({ comparison, workspace }, input) {
  if (!isEmptyObject(input)) {
    return toolError("get_comparison_state", "invalid_input", "The WebMCP request is invalid.");
  }
  return semanticState("get_comparison_state", comparison.getState(), workspace.getMode(), knownEvidenceIds(comparison));
}

function focusComparisonCell({ comparison, workspace, view }, input) {
  if (
    !isExactObject(input, ["roleId", "rowId"])
    || !ROLE_ID_PATTERN.test(input.roleId)
    || !ROW_ID_PATTERN.test(input.rowId)
  ) {
    return toolError("focus_comparison_cell", "invalid_input", "The WebMCP request is invalid.");
  }
  const state = comparison.getState();
  const row = state?.result?.rows?.find(({ id }) => id === input.rowId);
  const cell = row?.cells?.find(({ roleId }) => roleId === input.roleId);
  if (!cell || !CELL_ID_PATTERN.test(cell.id)) {
    return toolError("focus_comparison_cell", "cell_not_found", "That comparison cell is not available.");
  }
  const opened = openComparisonWorkspace(workspace, "focus_comparison_cell");
  if (opened) return opened;
  const selection = { rowId: row.id, roleId: cell.roleId, cellId: cell.id };
  comparison.selectComparisonCell(selection);
  view.focusComparisonCell(selection);
  return {
    ok: true,
    operation: "focus_comparison_cell",
    visibleRegion: "comparison",
    ...selection,
  };
}

function clearComparison({ comparison, workspace }, input) {
  if (!isEmptyObject(input)) {
    return toolError("clear_role_comparison", "invalid_input", "The WebMCP request is invalid.");
  }
  const opened = openComparisonWorkspace(workspace, "clear_role_comparison");
  if (opened) return opened;
  comparison.clearComparison();
  return semanticState("clear_role_comparison", comparison.getState(), workspace.getMode(), knownEvidenceIds(comparison));
}

function semanticState(operation, state, visibleRegion, evidenceIds) {
  const result = state?.result;
  const roles = Array.isArray(result?.roles)
    ? result.roles.slice(0, COMPARISON_CONTRACT.limits.maxRoles)
    : [];
  const rows = Array.isArray(result?.rows)
    ? result.rows.slice(0, COMPARISON_CONTRACT.limits.maxRows)
    : [];
  const roleIds = roles.map(({ id }) => id).filter((id) => ROLE_ID_PATTERN.test(id));
  const rowIds = rows.map(({ id }) => id).filter((id) => ROW_ID_PATTERN.test(id));
  const cells = rows.flatMap((row) => {
    if (!ROW_ID_PATTERN.test(row?.id) || !Array.isArray(row?.cells)) return [];
    return row.cells
      .slice(0, COMPARISON_CONTRACT.limits.maxRoles)
      .flatMap((cell) => sanitizeCell(row.id, cell, evidenceIds));
  });
  const selection = sanitizeSelection(state?.selection, cells);
  return {
    ok: true,
    operation,
    status: STATUS.has(state?.status) ? state.status : "editing",
    schemaVersion: result?.schemaVersion === COMPARISON_CONTRACT.schemaVersion
      ? result.schemaVersion
      : COMPARISON_CONTRACT.schemaVersion,
    catalogDigest: DIGEST_PATTERN.test(state?.catalogDigest || "") ? state.catalogDigest : "",
    visibleRegion: visibleRegion === "compare" ? "comparison" : "home",
    resultStale: state?.resultStale === true,
    counts: { roles: roleIds.length, rows: rowIds.length, cells: cells.length },
    roleIds,
    rowIds,
    cells,
    selection,
  };
}

function sanitizeCell(rowId, cell, evidenceIds) {
  if (
    !cell
    || !CELL_ID_PATTERN.test(cell.id || "")
    || !ROLE_ID_PATTERN.test(cell.roleId || "")
    || cell.id !== `cell_${rowId}_${cell.roleId}`
    || !COVERAGE.has(cell.coverage)
    || !Array.isArray(cell.evidence)
  ) return [];
  const evidence = cell.evidence.flatMap((reference) => (
    EVIDENCE_ID_PATTERN.test(reference?.evidenceId || "")
      && evidenceIds.has(reference.evidenceId)
      && REASON_CODES.has(reference?.reasonCode)
      ? [{ evidenceId: reference.evidenceId, reasonCode: reference.reasonCode }]
      : []
  )).slice(0, COMPARISON_CONTRACT.limits.maxEvidencePerCell);
  return [{ id: cell.id, rowId, roleId: cell.roleId, coverage: cell.coverage, evidence }];
}

function sanitizeSelection(selection, cells) {
  if (!selection || !cells.some(({ id, rowId, roleId }) => (
    id === selection.cellId && rowId === selection.rowId && roleId === selection.roleId
  ))) return { rowId: "", roleId: "", cellId: "" };
  return { rowId: selection.rowId, roleId: selection.roleId, cellId: selection.cellId };
}

function openComparisonWorkspace(workspace, operation) {
  const outcome = workspace.requestMode("compare");
  if (outcome?.status === "blocked") {
    return toolError(operation, "workspace_busy", "The comparison workspace cannot be opened while chat is active.");
  }
  if (!["changed", "unchanged"].includes(outcome?.status)) {
    return toolError(operation, "workspace_unavailable", "The comparison workspace is unavailable.");
  }
  return null;
}

async function safelyExecute(operation, execute) {
  try {
    return await execute();
  } catch {
    return toolError(operation, "internal_error", "The WebMCP operation could not be completed.");
  }
}

function toolError(operation, code, message) {
  return { ok: false, operation, error: { code, message } };
}

function abortedResult(operation) {
  return toolError(operation, "aborted", "The WebMCP operation was cancelled.");
}

function isEmptyObject(value) {
  return isExactObject(value, []);
}

function isExactObject(value, keys) {
  return Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key));
}

function isAbortSignal(value) {
  return Boolean(value)
    && typeof value === "object"
    && typeof value.aborted === "boolean"
    && typeof value.addEventListener === "function"
    && typeof value.removeEventListener === "function";
}

function knownEvidenceIds(comparison) {
  try {
    return new Set((comparison.getEvidenceItems() || []).flatMap((item) => (
      EVIDENCE_ID_PATTERN.test(item?.id || "") ? [item.id] : []
    )));
  } catch {
    return new Set();
  }
}

function hasAdapterDependencies(comparison, workspace, view) {
  return ["getState", "getEvidenceItems", "submitComparison", "cancelComparison", "clearComparison", "selectComparisonCell"]
    .every((name) => typeof comparison?.[name] === "function")
    && ["getMode", "requestMode"].every((name) => typeof workspace?.[name] === "function")
    && ["focusComparisonCell", "focusComparisonResult"].every((name) => typeof view?.[name] === "function");
}

function unsupportedRegistration() {
  return { supported: false, toolNames: [], cleanup: () => {} };
}
