import { readFileSync } from "node:fs";

// Owner identities for Worker and deploy-config tests; only the fields they read.
export const GRACE = {
  name: { full: "Grace Sample", short: "Grace" },
  site: {
    origin: "https://grace.example",
    hosts: ["grace.example", "www.grace.example", "grace-sample-agent-cv.agent-cv.workers.dev"],
  },
  contact: { email: "grace@grace.example" },
  deploy: {
    workerName: "grace-sample-agent-cv",
    archiveNamespaceId: "11111111111111111111111111111111",
    vars: {
      OPENAI_MODEL: "gpt-6-luna",
      OPENAI_REASONING_EFFORT: "none",
      MAX_OUTPUT_TOKENS: "700",
      MONTHLY_REQUEST_CAP: "1000",
      COMPARISON_MODEL: "gpt-6-luna",
      COMPARISON_MAX_OUTPUT_TOKENS: "8000",
      COMPARISON_MONTHLY_REQUEST_CAP: "60",
      ARCHIVE_RETENTION_DAYS: "90",
    },
  },
};

export const ADA = JSON.parse(readFileSync(new URL("../../examples/owner/owner.json", import.meta.url), "utf8"));

// A Unicode name with regex punctuation, so name matching cannot rely on ASCII word boundaries.
export const ELISE = {
  name: { full: "Élise D'Arcy-Núñez (Jr.)", short: "Élise" },
  site: { origin: "https://elise.example", hosts: ["elise.example"] },
};
