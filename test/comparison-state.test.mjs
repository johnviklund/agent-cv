import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPARISON_SNAPSHOT_VERSION,
  COMPARISON_STORAGE_KEY,
  MAX_COMPARISON_SNAPSHOT_BYTES,
  buildComparisonSnapshot,
  clearComparisonSnapshot,
  persistComparisonSnapshot,
  resolveSessionStorage,
  restoreComparisonSnapshot,
} from "../public/comparison-state.js";

const DIGEST = `sha256:${"a".repeat(64)}`;
const OTHER_DIGEST = `sha256:${"b".repeat(64)}`;
const EVIDENCE_IDS = new Set(["cv.profile"]);

test("matching same-tab state restores through the snapshot whitelist", () => {
  const storage = memoryStorage();
  const snapshot = buildComparisonSnapshot({
    catalogDigest: DIGEST,
    roles: roles(),
    result: result(),
    resultRoleFingerprint: "roles:one",
    selection: {
      rowId: "row_01",
      roleId: "role_01",
      cellId: "cell_row_01_role_01",
    },
  }, { evidenceIds: EVIDENCE_IDS });

  assert.equal(persistComparisonSnapshot(storage, snapshot), true);
  const restored = restoreComparisonSnapshot(storage, {
    catalogDigest: DIGEST,
    evidenceIds: EVIDENCE_IDS,
  });

  assert.equal(restored.storageAvailable, true);
  assert.equal(restored.reason, "matching");
  assert.deepEqual(restored.snapshot, snapshot);
  assert.notEqual(restored.snapshot, snapshot);
});

test("stale schema or catalog state retains only bounded role inputs", () => {
  for (const stored of [
    { ...storedSnapshot(), schemaVersion: COMPARISON_SNAPSHOT_VERSION + 1 },
    { ...storedSnapshot(), catalogDigest: OTHER_DIGEST },
  ]) {
    const storage = memoryStorage({ [COMPARISON_STORAGE_KEY]: JSON.stringify(stored) });
    const restored = restoreComparisonSnapshot(storage, {
      catalogDigest: DIGEST,
      evidenceIds: EVIDENCE_IDS,
    });

    assert.deepEqual(restored.snapshot.roles, roles());
    assert.equal(restored.snapshot.catalogDigest, DIGEST);
    assert.equal(restored.snapshot.result, null);
    assert.equal(restored.snapshot.resultRoleFingerprint, "");
    assert.deepEqual(restored.snapshot.selection, emptySelection());
    assert.equal(restored.reason, "stale");
  }
});

test("corrupt results retain valid role inputs without accepting unknown evidence", () => {
  const stored = storedSnapshot();
  stored.result.rows[0].cells[0].evidence[0].evidenceId = "unknown.item";
  const storage = memoryStorage({ [COMPARISON_STORAGE_KEY]: JSON.stringify(stored) });

  const restored = restoreComparisonSnapshot(storage, {
    catalogDigest: DIGEST,
    evidenceIds: EVIDENCE_IDS,
  });

  assert.equal(restored.reason, "invalid_result");
  assert.deepEqual(restored.snapshot.roles, roles());
  assert.equal(restored.snapshot.result, null);
});

test("unknown selected IDs are discarded instead of restored", () => {
  const stored = storedSnapshot();
  stored.selection = {
    rowId: "row_99",
    roleId: "role_01",
    cellId: "cell_row_99_role_01",
  };
  const storage = memoryStorage({ [COMPARISON_STORAGE_KEY]: JSON.stringify(stored) });

  const restored = restoreComparisonSnapshot(storage, {
    catalogDigest: DIGEST,
    evidenceIds: EVIDENCE_IDS,
  });

  assert.deepEqual(restored.snapshot.selection, emptySelection());
});

test("prototype-keyed input is rebuilt and never merged into runtime state", () => {
  const raw = JSON.stringify({
    ...storedSnapshot(),
    __proto__: { polluted: true },
    constructor: { prototype: { polluted: true } },
    extra: "discard me",
  });
  const storage = memoryStorage({ [COMPARISON_STORAGE_KEY]: raw });

  const restored = restoreComparisonSnapshot(storage, {
    catalogDigest: DIGEST,
    evidenceIds: EVIDENCE_IDS,
  });

  assert.equal(Object.prototype.polluted, undefined);
  assert.equal("extra" in restored.snapshot, false);
  assert.equal("constructor" in restored.snapshot, true, "normal Object prototype remains intact");
  assert.deepEqual(Object.keys(restored.snapshot), [
    "schemaVersion",
    "catalogDigest",
    "roles",
    "result",
    "resultRoleFingerprint",
    "selection",
  ]);
});

test("oversized or invalid stored JSON is discarded within the hard byte bound", () => {
  const oversized = JSON.stringify({ roles: roles(), padding: "x".repeat(MAX_COMPARISON_SNAPSHOT_BYTES) });
  for (const raw of [oversized, "{not json"] ) {
    const storage = memoryStorage({ [COMPARISON_STORAGE_KEY]: raw });
    const restored = restoreComparisonSnapshot(storage, {
      catalogDigest: DIGEST,
      evidenceIds: EVIDENCE_IDS,
    });

    assert.deepEqual(restored.snapshot.roles, []);
    assert.equal(restored.snapshot.result, null);
    assert.match(restored.reason, /oversized|corrupt/);
  }
});

test("storage exceptions degrade to memory and clear remains safe", () => {
  const storage = throwingStorage();
  const snapshot = buildComparisonSnapshot({ catalogDigest: DIGEST, roles: roles() });

  assert.equal(persistComparisonSnapshot(storage, snapshot), false);
  assert.equal(clearComparisonSnapshot(storage), false);
  const restored = restoreComparisonSnapshot(storage, {
    catalogDigest: DIGEST,
    evidenceIds: EVIDENCE_IDS,
  });
  assert.equal(restored.storageAvailable, false);
  assert.deepEqual(restored.snapshot.roles, []);
});

test("blocked sessionStorage getters resolve to the memory-only fallback without throwing", () => {
  const blockedWindow = Object.defineProperty({}, "sessionStorage", {
    get() { throw new Error("SecurityError"); },
  });
  assert.equal(resolveSessionStorage(blockedWindow), null);
  const storage = memoryStorage();
  assert.equal(resolveSessionStorage({ sessionStorage: storage }), storage);
});

test("snapshot serialization refuses values beyond the session byte budget", () => {
  const storage = memoryStorage();
  const snapshot = buildComparisonSnapshot({ catalogDigest: DIGEST, roles: roles() });
  snapshot.result = { padding: "x".repeat(MAX_COMPARISON_SNAPSHOT_BYTES) };

  assert.equal(persistComparisonSnapshot(storage, snapshot), false);
  assert.equal(storage.getItem(COMPARISON_STORAGE_KEY), null);
});

function storedSnapshot() {
  return {
    schemaVersion: COMPARISON_SNAPSHOT_VERSION,
    catalogDigest: DIGEST,
    roles: roles(),
    result: result(),
    resultRoleFingerprint: "roles:one",
    selection: {
      rowId: "row_01",
      roleId: "role_01",
      cellId: "cell_row_01_role_01",
    },
  };
}

function roles() {
  return [{
    title: "  AI Product Lead  ",
    company: " Example ",
    description: "Lead applied AI products.\r\nKeep evidence grounded.",
  }].map(({ title, company, description }) => ({
    title: title.trim(),
    company: company.trim(),
    description: description.replace("\r\n", "\n"),
  }));
}

function result() {
  return {
    schemaVersion: 2,
    catalogDigest: DIGEST,
    roles: [{ id: "role_01", position: 1, title: "AI Product Lead", company: "Example" }],
    rows: [{
      id: "row_01",
      position: 1,
      label: "Applied AI leadership",
      cells: [{
        id: "cell_row_01_role_01",
        roleId: "role_01",
        requirement: "Lead applied AI products",
        coverage: "documented",
        evidence: [{ evidenceId: "cv.profile", reasonCode: "direct_responsibility" }],
        questions: ["Which delivery decisions did John own?"],
      }],
    }],
    unmappedRequirements: [{ roleId: "role_01", requirements: [] }],
  };
}

function emptySelection() {
  return { rowId: "", roleId: "", cellId: "" };
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function throwingStorage() {
  return {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); },
  };
}
