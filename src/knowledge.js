import meta from "./data/meta.md";
import overview from "./data/overview.md";
import experience from "./data/experience.md";
import projects from "./data/projects.md";
import skills from "./data/skills.md";
import personal from "./data/personal.md";
import interests from "./data/interests.md";
import faq from "./data/faq.md";

export const knowledge = [meta, overview, experience, projects, skills, personal, interests, faq]
  .join("\n\n---\n\n");
