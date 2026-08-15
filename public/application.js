import { storePendingApplication } from "./chat-state.js";

const page = document.querySelector("[data-application-page]");
const slug = window.location.pathname.match(/^\/a\/([a-z0-9_-]{10,32})\/?$/i)?.[1]?.toLowerCase();
if (page && slug) loadApplication(page, slug);

async function loadApplication(container, applicationSlug) {
  try {
    const response = await fetch(`/api/application/${applicationSlug}`);
    if (!response.ok) throw new Error("This application link has expired or been revoked.");
    const application = await response.json();
    storePendingApplication(window.sessionStorage, application.slug);
    container.querySelector("[data-application-company]").textContent = application.company.toUpperCase();
    container.querySelector("[data-application-role]").textContent = application.role;
    container.querySelector("[data-application-heading]").textContent = `${application.role} · ${application.company}`;
    document.title = `${application.role} at ${application.company} — John Erik Viklund`;
  } catch (error) {
    container.querySelector("[data-application-heading]").textContent = error.message;
    container.querySelectorAll("form, .application-starters").forEach((element) => { element.hidden = true; });
  }
}
