import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { buildSystemPrompt } from "../src/chat-core.js";
import {
  buildComparisonInstructions,
  buildComparisonRequirementInventory,
  canonicalizeComparisonDraft,
  validateComparisonPayload,
} from "../src/comparison-core.js";
import { EVIDENCE_CATALOG as evidenceCatalog } from "./fixtures/evidence-catalog.mjs";
import { handleRequest } from "../src/worker.js";
import { ADA, ELISE, GRACE } from "./fixtures/owners.mjs";

const digest = (text) => `sha256:${createHash("sha256").update(text).digest("hex")}`;
const ROLES = [{ title: "Platform Lead", description: "- Build agent systems\n- Run evaluations" }];

// Recorded from the pre-owner prompt builders at 9aa0df6.
const FROZEN_COMPARISON = "sha256:f92b959495d4379a5b0848d308906d293e4f0bf46b90b42b4ced4859f26f0aca";

test("owner prompts name Ada and preserve the comparison contract", () => {
  const prompt = (owner) => buildSystemPrompt("<fixture knowledge>", { owner, updatedAt: "2026-10-18" });

  assert.equal(digest(buildComparisonInstructions()), FROZEN_COMPARISON);

  const ada = prompt(ADA);
  assert.match(ada, /^You are Ada's Agent CV: a concise, factual guide to Ada Example's professional experience\./);
  assert.match(ada, /Please ask Ada directly\./);
  assert.match(ada, /invitation to contact Ada at \/contact\//);
  assert.doesNotMatch(ada, /Grace/);
});

function draftWithLabel(label) {
  const roles = validateComparisonPayload({ roles: ROLES }).roles;
  const [{ requirements }] = buildComparisonRequirementInventory(roles);
  return {
    roles,
    draft: {
      rows: requirements.map((item, index) => ({
        label: index === 0 ? label : `Requirement ${index + 1}`,
        cells: [{
          roleIndex: 0,
          requirementId: item.id,
          coverage: "transferable",
          evidence: [{ evidenceId: evidenceCatalog.items[0].id, reasonCode: "related_domain_experience" }],
          questionKinds: ["ownership_scope"],
        }],
      })),
      unmappedRequirements: [{ roleIndex: 0, requirementIds: [] }],
    },
  };
}

test("comparison questions and conclusion guards name the selected owner", () => {
  const canonicalize = (owner, label) => {
    const { draft, roles } = draftWithLabel(label);
    return canonicalizeComparisonDraft(draft, roles, evidenceCatalog, undefined, owner);
  };

  for (const [owner, question] of [
    [GRACE, "Which parts of this work did Grace own directly?"],
    [ADA, "Which parts of this work did Ada own directly?"],
    [ELISE, "Which parts of this work did Élise own directly?"],
  ]) {
    assert.deepEqual(canonicalize(owner, "Agent delivery").rows[0].cells[0].questions, [question], owner.name.full);
  }

  for (const [owner, label] of [
    [ADA, "Ada scores 99%"],
    [ADA, "Ada Example ranks first"],
    [ADA, "Hire Ada"],
    [ADA, "Ada is a strong fit"],
    [ELISE, "Élise scores 9/10"],
    [ELISE, "élise ranks first"],
    [ELISE, "Élise D'Arcy-Núñez (Jr.) is an ideal candidate"],
    [ELISE, "Recommend Élise D'Arcy-Núñez (Jr.) for this role"],
    [ELISE, "Élise's fit score: 90%"],
  ]) {
    assert.throws(() => canonicalize(owner, label), { reason: "draft_hiring_conclusion" }, label);
  }

  for (const [owner, label] of [[ADA, "Ada platform work"], [ELISE, "Élise evaluation work"], [ELISE, "Élisemann scores 9/10"]]) {
    assert.equal(canonicalize(owner, label).rows[0].label, label);
  }
});

test("configured aliases redirect to the canonical origin and other hosts do not", async () => {
  const fetchFor = (owner, url) => handleRequest(new Request(url), {}, { waitUntil() {} }, { owner });

  for (const [owner, alias, location] of [
    [ADA, "https://www.ada.example/cv/?source=www", "https://ada.example/cv/?source=www"],
    [GRACE, "https://www.grace.example/projects/?a=1&b=2", "https://grace.example/projects/?a=1&b=2"],
    [GRACE, "https://grace-sample-agent-cv.agent-cv.workers.dev/cv/?source=workers", "https://grace.example/cv/?source=workers"],
  ]) {
    const response = await fetchFor(owner, alias);
    assert.equal(response.status, 308, alias);
    assert.equal(response.headers.get("location"), location, alias);
  }

  for (const [owner, url] of [
    [ADA, "https://ada.example/api/health"],
    [GRACE, "https://grace.example/api/health"],
    [GRACE, "http://localhost:8787/api/health"],
    [ADA, "https://www.grace.example/api/health"],
  ]) {
    assert.equal((await fetchFor(owner, url)).status, 200, url);
  }
});
