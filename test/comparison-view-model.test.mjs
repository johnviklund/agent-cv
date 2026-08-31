import test from "node:test";
import assert from "node:assert/strict";
import {
  buildComparisonStatusPresentation,
  buildComparisonViewModel,
  describeComparisonSelection,
} from "../public/comparison-view.js";
import {
  createLatestFileImport,
  parseRoleBatch,
  serializeComparisonExport,
  validateRoleDrafts,
} from "../public/comparison-transfer.js";

const STATE = {
  status: "ready",
  error: null,
  resultStale: false,
  storageAvailable: true,
  roles: [
    { title: "AI Product Lead", company: "Northstar", description: "Lead applied AI products." },
    { title: "Agent Engineer", company: "Signal", description: "Build reliable agent systems." },
  ],
  result: {
    schemaVersion: 2,
    catalogDigest: `sha256:${"a".repeat(64)}`,
    roles: [
      { id: "role_01", position: 1, title: "AI Product Lead", company: "Northstar" },
      { id: "role_02", position: 2, title: "Agent Engineer", company: "Signal" },
    ],
    rows: [{
      id: "row_01",
      position: 1,
      label: "Applied AI delivery",
      cells: [
        {
          id: "cell_row_01_role_01",
          roleId: "role_01",
          requirement: "Lead applied AI products",
          coverage: "documented",
          evidence: [{ evidenceId: "cv.profile", reasonCode: "direct_responsibility" }],
          questions: ["Which decisions did John own?"],
        },
        {
          id: "cell_row_01_role_02",
          roleId: "role_02",
          requirement: null,
          coverage: "not_listed",
          evidence: [],
          questions: ["Would <script>delivery</script> matter for this role?"],
        },
      ],
    }, {
      id: "row_02",
      position: 2,
      label: "Architecture ownership",
      cells: [
        {
          id: "cell_row_02_role_01",
          roleId: "role_01",
          requirement: "Own enterprise architecture",
          coverage: "not_documented",
          evidence: [],
          questions: [],
        },
        {
          id: "cell_row_02_role_02",
          roleId: "role_02",
          requirement: "Design agent architecture",
          coverage: "transferable",
          evidence: [{ evidenceId: "project.product-studio", reasonCode: "related_technical_exposure" }],
          questions: [],
        },
      ],
    }],
    unmappedRequirements: [
      {
        roleId: "role_01",
        requirements: ["Own vendor performance recovery and quarterly business reviews"],
      },
      { roleId: "role_02", requirements: [] },
    ],
  },
};

const EVIDENCE = [
  {
    id: "cv.profile",
    title: "Profile",
    text: "John owns applied-AI product direction.",
    source: { path: "data/cv.md", headingPath: ["Profile"] },
  },
  {
    id: "project.product-studio",
    title: "Product Studio",
    text: "**Status:** Active local-first personal system.\n\nJohn designed a governed agent loop.",
    source: { path: "data/projects.md", headingPath: ["Product Studio"] },
  },
];

test("builds an evidence-led matrix in API row and role order", () => {
  const model = buildComparisonViewModel(STATE, EVIDENCE);

  assert.deepEqual(model.roles.map(({ title }) => title), ["AI Product Lead", "Agent Engineer"]);
  assert.deepEqual(model.rows.map(({ label }) => label), ["Applied AI delivery", "Architecture ownership"]);
  assert.equal(model.rows[0].cells[0].coverageLabel, "Documented evidence");
  assert.equal(model.rows[0].cells[0].evidence[0].sourceUrl, "/cv/");
  assert.equal(model.rows[0].cells[0].evidence[0].reasonLabel, "Direct responsibility");
  assert.equal(model.rows[1].cells[1].evidence[0].projectStatus, "Active local-first personal system.");
  assert.deepEqual(model.roles[0].outcomeCounts, [
    { coverage: "documented", label: "Documented", count: 1 },
    { coverage: "transferable", label: "Transferable", count: 0 },
    { coverage: "not_documented", label: "Not documented", count: 1 },
    { coverage: "unmapped", label: "Not assessed", count: 1 },
  ]);
  assert.equal(model.roles[0].requirementTotal, 3);
  assert.equal(model.roles[0].assessedCount, 2);
  assert.deepEqual(model.roles[0].unmappedRequirements, [
    "Own vendor performance recovery and quarterly business reviews",
  ]);
  assert.deepEqual(model.roles[1].outcomeCounts, [
    { coverage: "documented", label: "Documented", count: 0 },
    { coverage: "transferable", label: "Transferable", count: 1 },
    { coverage: "not_documented", label: "Not documented", count: 0 },
    { coverage: "unmapped", label: "Not assessed", count: 0 },
  ]);
  assert.equal(model.roles[1].requirementTotal, 1);
});

test("keeps evidence gaps and absent requirements distinct without inventing evidence", () => {
  const model = buildComparisonViewModel(STATE, EVIDENCE);
  const absent = model.rows[0].cells[1];
  const gap = model.rows[1].cells[0];

  assert.equal(absent.coverageLabel, "Not listed in role");
  assert.match(absent.coverageDescription, /does not list/i);
  assert.equal(absent.requirement, null);
  assert.deepEqual(absent.evidence, []);
  assert.equal(gap.coverageLabel, "Not documented yet");
  assert.match(gap.coverageDescription, /not a claim.*lacks/i);
  assert.deepEqual(gap.evidence, []);
});

test("preserves generated questions as inert display text and marks prior results stale", () => {
  const model = buildComparisonViewModel({ ...STATE, resultStale: true }, EVIDENCE);

  assert.equal(model.isStale, true);
  assert.match(model.resultNotice, /previous role descriptions/i);
  assert.equal(
    model.rows[0].cells[1].questions[0],
    "Would <script>delivery</script> matter for this role?",
  );
});

test("presents one unambiguous comparison state across editing, errors, and refresh failures", () => {
  assert.equal(buildComparisonStatusPresentation({ status: "editing" }).indicator, "Comparison draft ready for editing.");
  assert.equal(buildComparisonStatusPresentation({ status: "analyzing" }).indicator, "Comparison in progress.");
  assert.equal(
    buildComparisonStatusPresentation({ status: "editing", error: {}, hasResult: false }).indicator,
    "Comparison unavailable. Review the message below and try again.",
  );
  assert.deepEqual(
    buildComparisonStatusPresentation({ status: "ready", error: {}, hasResult: true, isStale: true }),
    {
      indicator: "Previous comparison visible. The refresh failed, so this result does not reflect the edited role drafts.",
      errorLabel: "REFRESH FAILED · PREVIOUS RESULT VISIBLE",
      errorTitle: "The previous comparison is visible but no longer current.",
    },
  );
  assert.equal(
    buildComparisonStatusPresentation({ status: "ready", hasResult: true, isStale: false }).indicator,
    "Comparison ready.",
  );
});

test("validates role fields, role count, and combined limits without a DOM", () => {
  const valid = validateRoleDrafts(STATE.roles);
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.roles, STATE.roles);

  const invalid = validateRoleDrafts([
    { title: "", company: "", description: "" },
    { title: "x".repeat(121), company: "", description: "Role" },
  ]);
  assert.equal(invalid.valid, false);
  assert.equal(invalid.fieldErrors[0].title, "Enter a role title.");
  assert.equal(invalid.fieldErrors[0].description, "Paste the role description.");
  assert.match(invalid.fieldErrors[1].title, /120 characters/);

  const tooMany = validateRoleDrafts(Array.from({ length: 4 }, () => ({
    title: "Role", company: "", description: "Description",
  })));
  assert.equal(tooMany.valid, false);
  assert.match(tooMany.formError, /one to three roles/i);
});

test("describes a selected cell for focus and live announcements", () => {
  const model = buildComparisonViewModel(STATE, EVIDENCE);
  assert.equal(
    describeComparisonSelection(model.rows[0], model.roles[1]),
    "Opened details for Agent Engineer, Applied AI delivery.",
  );
});

test("imports agent-native JSON and positions-style Markdown batches", () => {
  const json = parseRoleBatch(JSON.stringify({ roles: STATE.roles }), { filename: "positions.json" });
  assert.deepEqual(json, STATE.roles);

  const markdown = parseRoleBatch(`# Positions

## Role: Support Operations Lead
**Company:** Northstar
**Description:**
## Responsibilities
Own vendor performance, workforce planning, QBRs, and commercial outcomes.

## Qualifications
- Experience recovering supplier performance.

## Role: AI Product Lead
Company: Signal
Description:
Lead applied AI products and responsible delivery.
`, { filename: "positions.md" });
  assert.deepEqual(markdown, [
    {
      title: "Support Operations Lead",
      company: "Northstar",
      description: "## Responsibilities\nOwn vendor performance, workforce planning, QBRs, and commercial outcomes.\n\n## Qualifications\n- Experience recovering supplier performance.",
    },
    {
      title: "AI Product Lead",
      company: "Signal",
      description: "Lead applied AI products and responsible delivery.",
    },
  ]);
  assert.throws(() => parseRoleBatch("# Positions\n\nNo role headings"), /explicit.*Role/i);
  assert.throws(
    () => parseRoleBatch("# Positions\n\n## Support Lead\n\n## Responsibilities\nOwn the operation."),
    /explicit.*Role/i,
  );
});

test("exports compact JSON and Markdown with denominators, evidence IDs, questions, and unmapped requirements", () => {
  const json = JSON.parse(serializeComparisonExport(STATE.result, "json"));
  assert.equal(json.roles[0].requirementSummary.total, 3);
  assert.deepEqual(json.roles[0].unmappedRequirements, [
    "Own vendor performance recovery and quarterly business reviews",
  ]);
  assert.deepEqual(json.rows[0].cells[0].evidence, [
    { evidenceId: "cv.profile", reasonCode: "direct_responsibility" },
  ]);
  assert.deepEqual(json.rows[0].cells[0].questions, ["Which decisions did John own?"]);

  const markdown = serializeComparisonExport(STATE.result, "markdown");
  assert.match(markdown, /Requirements assessed: 2 of 3/i);
  assert.match(markdown, /Not assessed[\s\S]*vendor performance recovery/i);
  assert.match(markdown, /cv\.profile/);
  assert.match(markdown, /Which decisions did John own\?/);
  assert.throws(() => serializeComparisonExport(STATE.result, "csv"), /format/i);
});

test("escapes active HTML and Markdown in every generated Markdown text field", () => {
  const result = structuredClone(STATE.result);
  result.roles[0].title = "![tracker](https://example.test/pixel)";
  result.roles[0].company = "<img src=x onerror=alert(1)>";
  result.rows[0].label = "[unsafe](javascript:alert(1))";
  result.rows[0].cells[0].requirement = "*Own* <script>vendor</script>";
  result.rows[0].cells[0].questions = ["![pixel](https://example.test/q)\n## Forged heading"];
  result.unmappedRequirements[0].requirements = ["<details open>hidden</details> | injected"];

  const markdown = serializeComparisonExport(result, "markdown");

  assert.match(markdown, /## \\!\\\[tracker\\\]\\\(https:\/\/example\\\.test\/pixel\\\)/);
  assert.match(markdown, /&lt;img src=x onerror=alert\\\(1\\\)&gt;/);
  assert.match(markdown, /\\\[unsafe\\\]\\\(javascript:alert\\\(1\\\)\\\)/);
  assert.match(markdown, /\\\*Own\\\* &lt;script&gt;vendor&lt;\/script&gt;/);
  assert.match(markdown, /\\!\\\[pixel\\\]\\\(https:\/\/example\\\.test\/q\\\) \\#\\# Forged heading/);
  assert.match(markdown, /&lt;details open&gt;hidden&lt;\/details&gt; \\| injected/);
  assert.doesNotMatch(markdown, /<img|<script|<details/);
});

test("only the latest asynchronous role file import may mutate the workspace", async () => {
  const first = deferred();
  const second = deferred();
  const applied = [];
  const errors = [];
  const cleared = [];
  const importFile = createLatestFileImport({
    maxBytes: 100_000,
    applySource: ({ file, source }) => applied.push({ name: file.name, source }),
    reportError: (error) => errors.push(error.message),
    clearSelection: (file) => cleared.push(file.name),
  });
  const firstFile = { name: "first.md", size: 20, text: () => first.promise };
  const secondFile = { name: "second.md", size: 20, text: () => second.promise };

  const firstImport = importFile(firstFile);
  const secondImport = importFile(secondFile);
  second.resolve("latest source");
  assert.deepEqual(await secondImport, { status: "ready" });
  first.resolve("stale source");
  assert.deepEqual(await firstImport, { status: "superseded" });

  assert.deepEqual(applied, [{ name: "second.md", source: "latest source" }]);
  assert.deepEqual(errors, []);
  assert.deepEqual(cleared, ["second.md"]);
});

test("a rejected superseded file read cannot replace the latest status", async () => {
  const first = deferred();
  const second = deferred();
  const errors = [];
  const cleared = [];
  const importFile = createLatestFileImport({
    applySource: () => {},
    reportError: (error) => errors.push(error.message),
    clearSelection: (file) => cleared.push(file.name),
  });
  const firstImport = importFile({ name: "first.md", size: 1, text: () => first.promise });
  const secondImport = importFile({ name: "second.md", size: 1, text: () => second.promise });

  second.resolve("latest source");
  await secondImport;
  first.reject(new Error("stale read failed"));
  assert.deepEqual(await firstImport, { status: "superseded" });
  assert.deepEqual(errors, []);
  assert.deepEqual(cleared, ["second.md"]);
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}
