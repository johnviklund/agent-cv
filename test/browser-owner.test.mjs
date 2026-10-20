import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadOwner } from "../scripts/owner.mjs";
import { renderSite } from "../scripts/build-site.mjs";
import { readOwner } from "../site/assets/dom.js";
import { agentLabel, applicationTitle, busyChatMessage } from "../site/assets/chat-state.js";
import { buildComparisonViewModel, comparisonOwnerCopy } from "../site/assets/comparison-view.js";
import { registerWebMCPTools } from "../site/assets/webmcp.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const example = await loadOwner({ root: resolve(root, "examples/owner") });
const withIdentity = (slug, full, short) => ({ ...example, owner: { ...example.owner, slug, name: { full, short } } });

const OWNERS = [
  {
    source: withIdentity("grace-sample", "Grace Sample", "Grace"),
    owner: { name: "Grace Sample", shortName: "Grace", slug: "grace-sample", lang: "en" },
    label: "GRACE'S AGENT",
    busy: "Grace's agent is still answering. Wait for the response before opening role comparison.",
    title: "Agent Engineer at Signal — Grace Sample",
    documented: "Grace's public CV or project record directly documents relevant experience.",
    gap: "The public CV does not document evidence for this requirement. This is not a claim that Grace lacks the capability.",
    questions: "Questions to ask Grace",
    download: "grace-sample-role-comparison.md",
  },
  {
    source: example,
    owner: { name: "Ada Example", shortName: "Ada", slug: "ada-example", lang: "en" },
    label: "ADA'S AGENT",
    busy: "Ada's agent is still answering. Wait for the response before opening role comparison.",
    title: "Agent Engineer at Signal — Ada Example",
    documented: "Ada's public CV or project record directly documents relevant experience.",
    gap: "The public CV does not document evidence for this requirement. This is not a claim that Ada lacks the capability.",
    questions: "Questions to ask Ada",
    download: "ada-example-role-comparison.md",
  },
  {
    source: withIdentity("elise-darcy", "Élise <D'Arcy> & \"Núñez\"", "Élise"),
    owner: { name: "Élise <D'Arcy> & \"Núñez\"", shortName: "Élise", slug: "elise-darcy", lang: "en" },
    label: "ÉLISE'S AGENT",
    busy: "Élise's agent is still answering. Wait for the response before opening role comparison.",
    title: "Agent Engineer at Signal — Élise <D'Arcy> & \"Núñez\"",
    documented: "Élise's public CV or project record directly documents relevant experience.",
    gap: "The public CV does not document evidence for this requirement. This is not a claim that Élise lacks the capability.",
    questions: "Questions to ask Élise",
    download: "elise-darcy-role-comparison.md",
  },
];

const ENTITIES = { amp: "&", quot: "\"", lt: "<", gt: ">", "#39": "'" };

// The <html> element of a rendered page as a browser exposes it: lang plus a camel-cased dataset.
function documentFor(html) {
  const tag = html.match(/<html\b([^>]*)>/)[1];
  const documentElement = { lang: "", dataset: {} };
  for (const [, name, raw] of tag.matchAll(/([\w-]+)="([^"]*)"/g)) {
    const value = raw.replace(/&(amp|quot|lt|gt|#39);/g, (_, entity) => ENTITIES[entity]);
    if (name === "lang") documentElement.lang = value;
    if (name.startsWith("data-")) documentElement.dataset[name.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = value;
  }
  return { documentElement };
}

const STATE = {
  status: "ready",
  roles: [{ title: "Agent Engineer", company: "Signal", description: "Build agents." }],
  result: {
    schemaVersion: 2,
    catalogDigest: `sha256:${"a".repeat(64)}`,
    roles: [{ id: "role_01", position: 1, title: "Agent Engineer", company: "Signal" }],
    rows: [{ id: "row_01", position: 1, label: "Agents", cells: [
      { id: "cell_row_01_role_01", roleId: "role_01", requirement: "Build agents", coverage: "documented", evidence: [], questions: [] },
    ] }, { id: "row_02", position: 2, label: "Evals", cells: [
      { id: "cell_row_02_role_01", roleId: "role_01", requirement: "Run evals", coverage: "not_documented", evidence: [], questions: [] },
    ] }],
    unmappedRequirements: [{ roleId: "role_01", requirements: [] }],
  },
};

test("rendered home and application pages give the browser the owner's chat, application and comparison copy", () => {
  for (const expected of OWNERS) {
    const pages = renderSite(expected.source);
    for (const page of ["index.html", "application/index.html"]) {
      const owner = readOwner(documentFor(pages[page]));
      const name = `${expected.owner.slug} ${page}`;

      assert.deepEqual(owner, expected.owner, name);
      assert.equal(agentLabel(owner), expected.label, name);
      assert.equal(busyChatMessage(owner), expected.busy, name);
      assert.equal(applicationTitle({ role: "Agent Engineer", company: "Signal" }, owner), expected.title, name);

      const cells = buildComparisonViewModel(STATE, [], owner).rows.map((row) => row.cells[0].coverageDescription);
      assert.deepEqual(cells, [expected.documented, expected.gap], name);
      const copy = comparisonOwnerCopy(owner);
      assert.equal(copy.questionsTitle, expected.questions, name);
      assert.equal(copy.exportFile("md"), expected.download, name);
    }
  }
});

const COMPARE_DESCRIPTION = "Compare one to three roles with Grace's published evidence. The supplied job titles, company names, and descriptions are sent to this site's comparison API and OpenAI for analysis before a result is shown on the page.";

async function registeredTools(owner) {
  const tools = [];
  const noop = () => {};
  await registerWebMCPTools({
    document: {
      documentElement: { lang: owner.lang, dataset: { ownerName: owner.name, ownerShortName: owner.shortName, ownerSlug: owner.slug } },
      modelContext: { registerTool(tool) { tools.push(tool); } },
    },
    comparison: {
      getState: noop, getEvidenceItems: noop, submitComparison: noop, cancelComparison: noop, clearComparison: noop, selectComparisonCell: noop,
    },
    workspace: { getMode: noop, requestMode: noop },
    view: { focusComparisonCell: noop, focusComparisonResult: noop },
  });
  return tools;
}

test("WebMCP keeps its four tools and schemas while the comparison description names the selected owner", async () => {
  const [grace, ada] = await Promise.all(OWNERS.slice(0, 2).map(({ owner }) => registeredTools(owner)));
  const contract = (tools) => tools.map(({ name, inputSchema }) => ({ name, inputSchema }));

  assert.deepEqual(grace.map(({ name }) => name), ["compare_candidate_roles", "get_comparison_state", "focus_comparison_cell", "clear_role_comparison"]);
  assert.deepEqual(contract(ada), contract(grace));
  assert.equal(grace[0].description, COMPARE_DESCRIPTION);
  assert.equal(ada[0].description, COMPARE_DESCRIPTION.replace("Grace's", "Ada's"));
});
