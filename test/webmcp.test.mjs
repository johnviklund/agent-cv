import test from "node:test";
import assert from "node:assert/strict";
import { registerWebMCPTools } from "../public/webmcp.js";

const DIGEST = `sha256:${"a".repeat(64)}`;
const ROLES = [
  { title: "AI Product Lead", company: "Northstar", description: "Lead applied AI products." },
  { title: "Agent Engineer", company: "Signal", description: "Build reliable agent systems." },
  { title: "Platform Lead", company: "Orbit", description: "Own the agent platform." },
];

test("registers exactly four strict imperative tools with only the getter marked read-only", async () => {
  const fixture = await setup();

  assert.deepEqual([...fixture.tools.keys()], [
    "compare_candidate_roles",
    "get_comparison_state",
    "focus_comparison_cell",
    "clear_role_comparison",
  ]);
  for (const tool of fixture.tools.values()) {
    assert.equal(tool.name.length > 0, true);
    assert.equal(tool.title.length > 0, true);
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.equal(typeof tool.execute, "function");
  }
  assert.match(fixture.tools.get("compare_candidate_roles").description, /sent.*comparison API.*OpenAI/i);
  assert.match(fixture.tools.get("compare_candidate_roles").title, /sent.*OpenAI/i);
  assert.deepEqual(fixture.tools.get("get_comparison_state").annotations, { readOnlyHint: true });
  assert.equal(fixture.tools.get("compare_candidate_roles").annotations, undefined);
  assert.equal(fixture.tools.get("focus_comparison_cell").annotations, undefined);
  assert.equal(fixture.tools.get("clear_role_comparison").annotations, undefined);

  const compareSchema = fixture.tools.get("compare_candidate_roles").inputSchema;
  assert.equal(compareSchema.properties.roles.minItems, 1);
  assert.equal(compareSchema.properties.roles.maxItems, 3);
  assert.deepEqual(compareSchema.properties.roles.items.required, ["title", "description"]);
  assert.equal(compareSchema.properties.roles.items.additionalProperties, false);
  assert.deepEqual(fixture.registrations.map(({ options }) => Object.keys(options)), [["signal"], ["signal"], ["signal"], ["signal"]]);
  fixture.registration.cleanup();
  assert.equal(fixture.registrations.every(({ options }) => options.signal.aborted), true);
});

test("three-role comparison opens the workspace, uses the shared controller, and returns no job or model prose", async () => {
  const fixture = await setup();
  const result = await execute(fixture, "compare_candidate_roles", { roles: ROLES });

  assert.deepEqual(fixture.modeRequests, ["compare"]);
  assert.deepEqual(fixture.submissions, [{ roles: ROLES, options: { source: "webmcp" } }]);
  assert.equal(fixture.resultFocuses, 1);
  assert.equal(result.ok, true);
  assert.equal(result.operation, "compare_candidate_roles");
  assert.equal(result.counts.roles, 3);
  assert.deepEqual(result.roleIds, ["role_01", "role_02", "role_03"]);
  assert.deepEqual(result.rowIds, ["row_01"]);
  assert.deepEqual(result.cells[0], {
    id: "cell_row_01_role_01",
    rowId: "row_01",
    roleId: "role_01",
    coverage: "documented",
    evidence: [{ evidenceId: "cv.profile", reasonCode: "direct_responsibility" }],
  });
  const serialized = JSON.stringify(result);
  for (const secret of ["AI Product Lead", "Northstar", "Lead applied AI products", "Requirement from model", "What did John own?", "provider exploded"]) {
    assert.equal(serialized.includes(secret), false, secret);
  }
});

test("rejects malformed, oversized, empty, excessive, and candidate-claim inputs before mutation", async () => {
  const fixture = await setup();
  const invalid = [
    {},
    { roles: [] },
    { roles: [...ROLES, ROLES[0]] },
    { roles: [{ title: "", description: "Valid" }] },
    { roles: [{ title: "Role", description: "x".repeat(6001) }] },
    { roles: [{ title: "Role", description: "Valid", score: 99 }] },
    { roles: [ROLES[0]], candidateClaims: ["perfect fit"] },
  ];
  for (const input of invalid) {
    const result = await execute(fixture, "compare_candidate_roles", input);
    assert.deepEqual(result.error, {
      code: "invalid_input",
      message: "The WebMCP request is invalid.",
    });
  }
  assert.deepEqual(fixture.modeRequests, []);
  assert.deepEqual(fixture.submissions, []);
});

test("read-only state exposes a bounded semantic index without untrusted text", async () => {
  const fixture = await setup();
  const result = await execute(fixture, "get_comparison_state", {});

  assert.equal(result.ok, true);
  assert.equal(result.operation, "get_comparison_state");
  assert.equal(result.visibleRegion, "comparison");
  assert.deepEqual(result.selection, {
    rowId: "row_01",
    roleId: "role_01",
    cellId: "cell_row_01_role_01",
  });
  assert.deepEqual(Object.keys(result).sort(), [
    "catalogDigest", "cells", "counts", "ok", "operation", "resultStale", "roleIds",
    "rowIds", "schemaVersion", "selection", "status", "visibleRegion",
  ]);
  assert.equal(JSON.stringify(result).includes("hostile"), false);
});

test("focus validates opaque IDs before selecting and focuses the rendered cell", async () => {
  const fixture = await setup();
  const valid = await execute(fixture, "focus_comparison_cell", { roleId: "role_01", rowId: "row_01" });
  assert.equal(valid.ok, true);
  assert.equal(valid.cellId, "cell_row_01_role_01");
  assert.deepEqual(fixture.selections, [{ rowId: "row_01", roleId: "role_01", cellId: "cell_row_01_role_01" }]);
  assert.deepEqual(fixture.cellFocuses, [{ rowId: "row_01", roleId: "role_01", cellId: "cell_row_01_role_01" }]);

  const invalid = await execute(fixture, "focus_comparison_cell", { roleId: "role_01", rowId: "row_02" });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, "cell_not_found");
  assert.equal(fixture.selections.length, 1);
  assert.equal(fixture.cellFocuses.length, 1);
});

test("clear cancels state and leaves the comparison workspace visible", async () => {
  const fixture = await setup();
  const result = await execute(fixture, "clear_role_comparison", {});

  assert.equal(result.ok, true);
  assert.equal(result.operation, "clear_role_comparison");
  assert.deepEqual(fixture.modeRequests, ["compare"]);
  assert.equal(fixture.clears, 1);
  assert.equal(result.counts.roles, 0);
});

test("an external execution abort is routed through the request-owned signal", async () => {
  const pending = deferred();
  let submittedOptions;
  const fixture = await setup({ submit: (_roles, options) => {
    submittedOptions = options;
    return pending.promise;
  } });
  const abortController = new AbortController();
  const request = execute(fixture, "compare_candidate_roles", { roles: ROLES.slice(0, 1) }, { signal: abortController.signal });
  await Promise.resolve();
  abortController.abort();
  pending.resolve({ status: "superseded" });

  const result = await request;
  assert.equal(submittedOptions.signal, abortController.signal);
  assert.equal(fixture.cancels, 0);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "aborted");
  assert.equal(fixture.state.result.rows[0].id, "row_01");
});

test("aborting a busy WebMCP invocation never cancels the comparison it did not start", async () => {
  const pending = deferred();
  const fixture = await setup({ submit: () => pending.promise });
  const abortController = new AbortController();
  const request = execute(fixture, "compare_candidate_roles", { roles: ROLES.slice(0, 1) }, { signal: abortController.signal });
  await Promise.resolve();

  abortController.abort();
  pending.resolve({ status: "busy" });

  const result = await request;
  assert.equal(fixture.cancels, 0);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "aborted");
});

test("missing APIs and rejected registrations fail closed without affecting the page", async () => {
  const unavailable = await registerWebMCPTools({ document: {}, comparison: {}, workspace: {}, view: {} });
  assert.equal(unavailable.supported, false);

  let registered = 0;
  const rejected = await registerWebMCPTools({
    document: { modelContext: { registerTool() { registered += 1; throw new Error("browser detail"); } } },
    comparison: {
      getState() {}, getEvidenceItems() {}, submitComparison() {}, cancelComparison() {}, clearComparison() {}, selectComparisonCell() {},
    },
    workspace: { getMode() {}, requestMode() {} },
    view: { focusComparisonCell() {}, focusComparisonResult() {} },
  });
  assert.equal(rejected.supported, false);
  assert.equal(registered, 1);
  assert.doesNotThrow(() => rejected.cleanup());
});

async function setup({ submit } = {}) {
  const tools = new Map();
  const registrations = [];
  const modeRequests = [];
  const submissions = [];
  const selections = [];
  const cellFocuses = [];
  const state = comparisonState();
  const fixture = {
    tools, registrations, modeRequests, submissions, selections, cellFocuses, state,
    resultFocuses: 0, clears: 0, cancels: 0,
  };
  const comparison = {
    getState: () => structuredClone(state),
    getEvidenceItems: () => [{ id: "cv.profile" }],
    submitComparison: async (roles, options) => {
      submissions.push({ roles: structuredClone(roles), options });
      return submit ? submit(roles, options) : { status: "ready", result: state.result };
    },
    selectComparisonCell: (selection) => { selections.push(selection); state.selection = selection; },
    clearComparison: () => {
      fixture.clears += 1;
      state.status = "editing"; state.roles = []; state.result = null; state.selection = { rowId: "", roleId: "", cellId: "" };
    },
    cancelComparison: () => { fixture.cancels += 1; },
  };
  const workspace = {
    getMode: () => "compare",
    requestMode: (mode) => { modeRequests.push(mode); return { status: "changed", mode }; },
  };
  const view = {
    focusComparisonCell: (selection) => { cellFocuses.push(selection); },
    focusComparisonResult: () => { fixture.resultFocuses += 1; },
  };
  const document = { modelContext: { async registerTool(tool, options) { tools.set(tool.name, tool); registrations.push({ tool, options }); } } };
  fixture.registration = await registerWebMCPTools({ document, comparison, workspace, view });
  return fixture;
}

function execute(fixture, name, input, options = {}) {
  return fixture.tools.get(name).execute(input, options);
}

function comparisonState() {
  return {
    status: "ready",
    error: { code: "provider", message: "provider exploded" },
    resultStale: false,
    catalogDigest: DIGEST,
    roles: ROLES,
    selection: { rowId: "row_01", roleId: "role_01", cellId: "cell_row_01_role_01" },
    result: {
      schemaVersion: 1,
      catalogDigest: DIGEST,
      roles: ROLES.map((role, index) => ({ id: `role_0${index + 1}`, position: index + 1, title: role.title, company: role.company })),
      rows: [{
        id: "row_01", position: 1, label: "hostile model row",
        cells: ROLES.map((_role, index) => ({
          id: `cell_row_01_role_0${index + 1}`, roleId: `role_0${index + 1}`,
          requirement: "Requirement from model", coverage: index ? "not_documented" : "documented",
          evidence: index ? [] : [{ evidenceId: "cv.profile", reasonCode: "direct_responsibility" }],
          questions: ["What did John own?"],
        })),
      }],
    },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
