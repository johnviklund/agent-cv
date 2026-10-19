import { readFileSync } from "node:fs";

// Owner identities for Worker and deploy-config tests; only the fields they read.
export const JOHN = {
  name: { full: "John Viklund", short: "John" },
  site: {
    origin: "https://johnviklund.com",
    hosts: ["johnviklund.com", "www.johnviklund.com", "john-viklund-agent-cv.agent-cv.workers.dev"],
  },
  contact: { email: "johnwik@gmail.com" },
  deploy: {
    workerName: "john-viklund-agent-cv",
    archiveNamespaceId: "66eaa9b0f9724e31980aec66972ad219",
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
