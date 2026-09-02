// Synthetic text only: preserve the audited posting structure, never private job copy.
export const PLAIN_LINE_REQUIREMENT_COUNTS = [12, 17, 19];
export const PLAIN_LINE_BATCH = [
  [5, 7, "You Might Thrive In This Role If You"],
  [9, 8, "You’ll Thrive In This Role If You"],
  [10, 9, "You Might Thrive In This Role If You"],
].map(([responsibilities, qualifications, heading], roleIndex) => [
  `## Role title: Example operations role ${roleIndex + 1}`,
  "Company: Example company",
  "### About The Team",
  "TEAM_CONTEXT_ONLY We work across departments.",
  "### About The Role",
  "SUMMARY_CONTEXT_ONLY This is a broad introduction to the opportunity.",
  "This role is based in Example City.",
  "We use a hybrid work model of 3 days in the office per week and offer relocation assistance to new employees.",
  "### In This Role, You Will",
  ...Array.from({ length: responsibilities }, (_, i) => `Own operating process ${i + 1}, coordinate partners, and track outcomes.`),
  `### ${heading}`,
  ...Array.from({ length: qualifications }, (_, i) => `Bring experience with delivery practice ${i + 1}. Explain tradeoffs and decisions.`),
].join("\n")).join("\n\n");
