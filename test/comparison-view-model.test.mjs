import test from "node:test";
import assert from "node:assert/strict";
import {
  buildComparisonViewModel,
  describeComparisonSelection,
  validateRoleDrafts,
} from "../public/comparison-view.js";

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
    { coverage: "not_listed", label: "Not listed", count: 0 },
  ]);
  assert.deepEqual(model.roles[1].outcomeCounts, [
    { coverage: "documented", label: "Documented", count: 0 },
    { coverage: "transferable", label: "Transferable", count: 1 },
    { coverage: "not_documented", label: "Not documented", count: 0 },
    { coverage: "not_listed", label: "Not listed", count: 1 },
  ]);
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
