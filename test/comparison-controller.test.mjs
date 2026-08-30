import test from "node:test";
import assert from "node:assert/strict";
import { COMPARISON_STORAGE_KEY } from "../public/comparison-state.js";
import { createComparisonController } from "../public/comparison-controller.js";
import { createWorkspaceController } from "../public/workspace-controller.js";

const DIGEST = `sha256:${"a".repeat(64)}`;
const OTHER_DIGEST = `sha256:${"b".repeat(64)}`;
const CATALOG = { digest: DIGEST, items: [{ id: "cv.profile" }] };
const ROLES = [{ title: "AI Product Lead", company: "Example", description: "Lead applied AI products." }];

test("a successful comparison validates before replacing the prior result", async () => {
  const prior = comparisonResult({ label: "Prior evidence" });
  const next = comparisonResult({ label: "Fresh evidence" });
  const storage = memoryStorage();
  const controller = createComparisonController({
    storage,
    loadCatalog: async () => CATALOG,
    fetchImpl: async () => response(next),
  });
  await controller.initialize();
  await controller.submitComparison(ROLES);
  controller.setRoles([{ ...ROLES[0], description: "Edited description" }]);
  assert.equal(controller.getState().result.rows[0].label, "Fresh evidence");
  assert.equal(controller.getState().resultStale, true);

  const pending = deferred();
  let fetchCalls = 0;
  const replacement = createComparisonController({
    storage: memoryStorage(),
    loadCatalog: async () => CATALOG,
    fetchImpl: async () => {
      fetchCalls += 1;
      return fetchCalls === 1 ? response(prior) : pending.promise;
    },
  });
  await replacement.initialize();
  await replacement.submitComparison(ROLES);
  const request = replacement.submitComparison(ROLES);
  assert.equal(replacement.getState().result.rows[0].label, "Prior evidence");
  pending.resolve(response(next));
  assert.equal((await request).status, "ready");
  assert.equal(replacement.getState().result.rows[0].label, "Fresh evidence");
  assert.ok(storage.getItem(COMPARISON_STORAGE_KEY));
});

test("a second submission while analyzing returns busy without another fetch", async () => {
  const pending = deferred();
  let calls = 0;
  const controller = await initializedController({
    fetchImpl: () => { calls += 1; return pending.promise; },
  });

  const first = controller.submitComparison(ROLES);
  const second = await controller.submitComparison(ROLES);
  assert.deepEqual(second, { status: "busy" });
  await Promise.resolve();
  assert.equal(calls, 1);
  controller.cancelComparison();
  pending.resolve(response(comparisonResult()));
  await first;
});

test("abort, network, public API, invalid output, and catalog skew preserve roles and prior result", async () => {
  const failures = [
    { fetchImpl: async () => { throw new Error("offline"); }, code: "network_error" },
    { fetchImpl: async () => response({ error: "Monthly limit" }, 503), code: "api_error" },
    { fetchImpl: async () => response({ score: 99 }), code: "invalid_result" },
    { fetchImpl: async () => response(comparisonResult({ digest: OTHER_DIGEST }), 200, OTHER_DIGEST), code: "catalog_skew" },
    { loadCatalog: async () => { throw new Error("catalog offline"); }, code: "catalog_unavailable" },
  ];

  for (const failure of failures) {
    const controller = await readyController(failure);
    const prior = controller.getState().result;
    const outcome = await controller.submitComparison(ROLES);
    const state = controller.getState();
    assert.equal(outcome.status, "error");
    assert.equal(state.error.code, failure.code);
    assert.deepEqual(state.roles, ROLES);
    assert.deepEqual(state.result, prior);
  }
});

test("cancel preserves inputs and prior result and rejects a late response", async () => {
  const pending = deferred();
  let requestSignal;
  const controller = await readyController({ fetchImpl: (_url, init) => {
    requestSignal = init.signal;
    return pending.promise;
  } });
  const prior = controller.getState().result;

  const request = controller.submitComparison(ROLES);
  await new Promise(setImmediate);
  assert.equal(controller.cancelComparison().status, "ready");
  assert.equal(requestSignal.aborted, true);
  pending.resolve(response(comparisonResult({ label: "Too late" })));
  assert.equal((await request).status, "superseded");
  assert.deepEqual(controller.getState().roles, ROLES);
  assert.deepEqual(controller.getState().result, prior);
});

test("clear during a request erases memory and storage and rejects a late response", async () => {
  const pending = deferred();
  const storage = memoryStorage();
  const controller = await readyController({ storage, fetchImpl: () => pending.promise });

  const request = controller.submitComparison(ROLES);
  controller.clearComparison();
  assert.equal(storage.getItem(COMPARISON_STORAGE_KEY), null);
  assert.deepEqual(controller.getState().roles, []);
  assert.equal(controller.getState().result, null);
  pending.resolve(response(comparisonResult({ label: "Too late" })));
  assert.equal((await request).status, "superseded");
  assert.equal(controller.getState().result, null);
});

test("editing roles during analysis aborts and supersedes the active request", async () => {
  const pending = deferred();
  let requestSignal;
  const controller = await initializedController({ fetchImpl: (_url, init) => {
    requestSignal = init.signal;
    return pending.promise;
  } });

  const request = controller.submitComparison(ROLES);
  await new Promise(setImmediate);
  controller.setRoles([{ ...ROLES[0], description: "A replacement role description." }]);
  assert.equal(requestSignal.aborted, true);
  assert.equal(controller.getState().status, "editing");
  pending.resolve(response(comparisonResult()));
  assert.equal((await request).status, "superseded");
});

test("invalid role bounds fail locally without replacing state or calling the API", async () => {
  let calls = 0;
  const controller = await initializedController({ fetchImpl: async () => {
    calls += 1;
    return response(comparisonResult());
  } });

  const outcome = await controller.submitComparison([{ title: "", company: "", description: "Role" }]);
  assert.equal(outcome.status, "error");
  assert.equal(outcome.error.code, "invalid_input");
  assert.equal(calls, 0);
  assert.equal(controller.getState().result, null);
});

test("manual and agent callers share one path and produce identical state", async () => {
  const make = async () => initializedController({ fetchImpl: async () => response(comparisonResult()) });
  const manual = await make();
  const agent = await make();

  await manual.submitComparison(ROLES, { source: "manual" });
  await agent.submitComparison(ROLES, { source: "agent" });

  assert.deepEqual(agent.getState(), manual.getState());
  assert.equal(agent.getState().result.rows[0].cells[0].id, "cell_row_01_role_01");
});

test("coverage gaps remain distinct and questions coexist with every state", async () => {
  const result = comparisonResult();
  result.rows.push(gapRow("row_02", 2, "not_documented", "Which project demonstrates this?"));
  result.rows.push(gapRow("row_03", 3, "not_listed", "Would this matter in practice?", null));
  const controller = await initializedController({ fetchImpl: async () => response(result) });

  assert.equal((await controller.submitComparison(ROLES)).status, "ready");
  const [, notDocumented, notListed] = controller.getState().result.rows;
  assert.equal(notDocumented.cells[0].coverage, "not_documented");
  assert.equal(notListed.cells[0].coverage, "not_listed");
  assert.equal(notDocumented.cells[0].questions.length, 1);
  assert.equal(notListed.cells[0].questions.length, 1);
});

test("workspace mode changes cancel comparison work while chat work blocks navigation", () => {
  let hash = "#compare";
  let comparisonBusy = true;
  let cancelled = 0;
  let chatBusy = false;
  const changes = [];
  const workspace = createWorkspaceController({
    getHash: () => hash,
    replaceHash: (value) => { hash = value; },
    comparison: {
      isBusy: () => comparisonBusy,
      cancelComparison: () => { cancelled += 1; comparisonBusy = false; },
    },
    chat: { isBusy: () => chatBusy },
    onModeChange: (mode) => changes.push(mode),
  });

  workspace.start();
  assert.equal(workspace.getMode(), "compare");
  assert.equal(workspace.requestMode("home").status, "changed");
  assert.equal(cancelled, 1);
  assert.equal(hash, "");

  chatBusy = true;
  assert.equal(workspace.requestMode("compare").status, "blocked");
  assert.equal(hash, "");
  assert.deepEqual(changes, ["compare", "home"]);
});

test("external hash navigation restores the active hash when chat is streaming", () => {
  let hash = "";
  let listener;
  const workspace = createWorkspaceController({
    getHash: () => hash,
    replaceHash: (value) => { hash = value; },
    subscribeHashChange: (callback) => { listener = callback; return () => {}; },
    comparison: { isBusy: () => false, cancelComparison() {} },
    chat: { isBusy: () => true },
  });
  workspace.start();

  hash = "#compare";
  listener();
  assert.equal(workspace.getMode(), "home");
  assert.equal(hash, "");
});

async function readyController(overrides = {}) {
  let catalogCalls = 0;
  let fetchCalls = 0;
  const controller = await initializedController({
    ...overrides,
    loadCatalog: async (...args) => {
      catalogCalls += 1;
      if (catalogCalls > 2 && overrides.loadCatalog) return overrides.loadCatalog(...args);
      return CATALOG;
    },
    fetchImpl: async (...args) => {
      fetchCalls += 1;
      if (fetchCalls === 1) return response(comparisonResult({ label: "Prior evidence" }));
      return (overrides.fetchImpl || (async () => response(comparisonResult())))(...args);
    },
  });
  await controller.submitComparison(ROLES);
  return controller;
}

async function initializedController(overrides = {}) {
  const controller = createComparisonController({
    storage: memoryStorage(),
    loadCatalog: async () => CATALOG,
    fetchImpl: async () => response(comparisonResult()),
    ...overrides,
  });
  await controller.initialize();
  return controller;
}

function comparisonResult({ label = "Applied AI leadership", digest = DIGEST } = {}) {
  return {
    schemaVersion: 1,
    catalogDigest: digest,
    roles: [{ id: "role_01", position: 1, title: "AI Product Lead", company: "Example" }],
    rows: [{
      id: "row_01",
      position: 1,
      label,
      cells: [{
        id: "cell_row_01_role_01",
        roleId: "role_01",
        requirement: "Lead applied AI products",
        coverage: "documented",
        evidence: [{ evidenceId: "cv.profile", reasonCode: "direct_responsibility" }],
        questions: ["Which decisions did John own?"],
      }],
    }],
  };
}

function gapRow(id, position, coverage, question, requirement = "A listed requirement") {
  return {
    id,
    position,
    label: `${coverage} row`,
    cells: [{
      id: `cell_${id}_role_01`,
      roleId: "role_01",
      requirement,
      coverage,
      evidence: [],
      questions: [question],
    }],
  };
}

function response(body, status = 200, digest = DIGEST) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "x-comparison-catalog-digest": digest,
    },
  });
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
