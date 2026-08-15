import { createLink } from "./dom.js";

let adminToken = "";
let authRequestGeneration = 0;

const authForm = document.querySelector("[data-admin-form]");
const applicationForm = document.querySelector("[data-application-form]");
const applicationList = document.querySelector("[data-application-list]");
const applicationStatus = document.querySelector("[data-application-status]");
const dashboard = document.querySelector("[data-admin-dashboard]");
const statsList = document.querySelector("[data-admin-stats]");
const status = document.querySelector("[data-admin-status]");
const exportButton = document.querySelector("[data-admin-export]");

authForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const requestGeneration = ++authRequestGeneration;
  const candidateToken = new FormData(authForm).get("token")?.toString().trim() || "";
  if (!candidateToken) return;
  status.textContent = "Loading private archive…";
  try {
    const data = await fetchDashboard(candidateToken);
    if (requestGeneration !== authRequestGeneration) return;
    adminToken = candidateToken;
    renderStats(data.stats);
    renderApplications(data.applications);
    dashboard.hidden = false;
    status.textContent = data.stats.truncated?.conversations || data.stats.truncated?.resources
      ? "Archive connected. Some aggregate counts reached the safety cap; use the complete paginated export for analysis."
      : "Archive connected.";
  } catch (error) {
    if (requestGeneration !== authRequestGeneration) return;
    dashboard.hidden = true;
    status.textContent = error.message;
  }
});

applicationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = applicationForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  const data = Object.fromEntries(new FormData(applicationForm));
  data.expiresDays = Number(data.expiresDays);
  applicationStatus.textContent = "Creating expiring application link…";
  try {
    const response = await adminFetch("/api/admin/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "The link could not be created.");
    const application = await response.json();
    applicationForm.reset();
    applicationStatus.replaceChildren(
      document.createTextNode("Created: "),
      createLink(new URL(application.url, window.location.origin).href, application.url),
    );
    await loadApplications();
  } catch (error) {
    applicationStatus.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

exportButton?.addEventListener("click", async () => {
  exportButton.disabled = true;
  status.textContent = "Preparing JSONL export…";
  try {
    const parts = [];
    let cursor = "";
    let disposition = "";
    do {
      const path = `/api/admin/conversations?limit=250${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
      const response = await adminFetch(path);
      if (!response.ok) throw new Error("The export could not be prepared.");
      parts.push(await response.blob());
      disposition ||= response.headers.get("content-disposition") || "";
      cursor = response.headers.get("x-archive-next-cursor") || "";
    } while (cursor);
    const blob = new Blob(parts, { type: "application/x-ndjson" });
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] || "agent-cv-conversations.jsonl";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    status.textContent = "Conversation export downloaded.";
  } catch (error) {
    status.textContent = error.message;
  } finally {
    exportButton.disabled = false;
  }
});

function adminFetch(path, init = {}, token = adminToken) {
  return fetch(path, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${token}` },
  });
}

async function fetchDashboard(token) {
  const [statsResponse, applicationsResponse] = await Promise.all([
    adminFetch("/api/admin/stats", {}, token),
    adminFetch("/api/admin/applications", {}, token),
  ]);
  if (!statsResponse.ok || !applicationsResponse.ok) {
    const statusCode = !statsResponse.ok ? statsResponse.status : applicationsResponse.status;
    throw new Error(statusCode === 401 ? "That token was not accepted." : "The archive is unavailable.");
  }
  return {
    stats: await statsResponse.json(),
    applications: (await applicationsResponse.json()).applications,
  };
}

async function loadApplications() {
  const response = await adminFetch("/api/admin/applications");
  if (!response.ok) throw new Error("Application links could not be loaded.");
  renderApplications((await response.json()).applications);
}

function renderApplications(applications) {
  if (!applications.length) {
    applicationList.textContent = "No application links yet.";
    return;
  }
  applicationList.replaceChildren(...applications.map((application) => {
    const item = document.createElement("article");
    item.className = "admin-application-item";
    const copy = document.createElement("div");
    const heading = document.createElement("h3");
    const meta = document.createElement("p");
    heading.textContent = `${application.role} · ${application.company}`;
    meta.textContent = `${application.revoked ? "Revoked" : "Active"} · expires ${new Date(application.expiresAt).toLocaleDateString()} · ${application.views || 0} views · ${application.questions || 0} questions`;
    copy.append(heading, meta, createLink(`/a/${application.slug}/`, `/a/${application.slug}/`));
    const revoke = document.createElement("button");
    revoke.type = "button";
    revoke.textContent = application.revoked ? "Revoked" : "Revoke";
    revoke.disabled = application.revoked;
    revoke.addEventListener("click", async () => {
      revoke.disabled = true;
      const response = await adminFetch(`/api/admin/applications/${application.slug}/revoke`, { method: "POST" });
      if (response.ok) await loadApplications();
      else revoke.disabled = false;
    });
    item.append(copy, revoke);
    return item;
  }));
}

function renderStats(stats) {
  const values = [
    ["Sessions", stats.conversations.sessions],
    ["Conversation turns", stats.conversations.turns],
    ["Helpful", stats.conversations.helpful],
    ["Needs work", stats.conversations.notHelpful],
    ["Bot resource fetches", stats.resources.bot],
    ["Retention", `${stats.retentionDays} days`],
  ];
  statsList.replaceChildren(...values.map(([label, value]) => {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = String(value);
    wrapper.append(term, description);
    return wrapper;
  }));
}
