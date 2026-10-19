// An explicit evidence catalog for comparison tests, so they never depend on an owner's generated evidence.
export const EVIDENCE_CATALOG = Object.freeze({
  schemaVersion: 1,
  digest: "sha256:5f2c6d0e1b7a4c3f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f",
  items: [
    {
      id: "cv.profile",
      title: "Profile",
      text: "Builds applied-AI products and leads cross-functional delivery.",
      source: { path: "data/cv.md", headingPath: ["Profile"] },
    },
    {
      id: "project.alpha",
      title: "Alpha",
      text: "Built an evaluated agent system with human oversight.",
      source: { path: "data/projects.md", headingPath: ["Alpha"] },
    },
  ],
});
