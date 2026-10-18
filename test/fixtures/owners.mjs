import { readFileSync } from "node:fs";

// Owner identities for Worker tests; only the fields the Worker reads.
export const JOHN = {
  name: { full: "John Viklund", short: "John" },
  site: {
    origin: "https://johnviklund.com",
    hosts: ["johnviklund.com", "www.johnviklund.com", "john-viklund-agent-cv.agent-cv.workers.dev"],
  },
};

export const ADA = JSON.parse(readFileSync(new URL("../../examples/owner/owner.json", import.meta.url), "utf8"));

// A Unicode name with regex punctuation, so name matching cannot rely on ASCII word boundaries.
export const ELISE = {
  name: { full: "Élise D'Arcy-Núñez (Jr.)", short: "Élise" },
  site: { origin: "https://elise.example", hosts: ["elise.example"] },
};
