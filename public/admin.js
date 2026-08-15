let adminToken = "";

const form = document.querySelector("[data-admin-form]");
const dashboard = document.querySelector("[data-admin-dashboard]");
const statsList = document.querySelector("[data-admin-stats]");
const status = document.querySelector("[data-admin-status]");
const exportButton = document.querySelector("[data-admin-export]");

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  adminToken = new FormData(form).get("token")?.toString().trim() || "";
  if (!adminToken) return;
  status.textContent = "Loading private archive…";
  try {
    const response = await adminFetch("/api/admin/stats");
    if (!response.ok) throw new Error(response.status === 401 ? "That token was not accepted." : "The archive is unavailable.");
    renderStats(await response.json());
    dashboard.hidden = false;
    status.textContent = "Archive connected.";
  } catch (error) {
    dashboard.hidden = true;
    status.textContent = error.message;
  }
});

exportButton?.addEventListener("click", async () => {
  exportButton.disabled = true;
  status.textContent = "Preparing JSONL export…";
  try {
    const response = await adminFetch("/api/admin/conversations");
    if (!response.ok) throw new Error("The export could not be prepared.");
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
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

function adminFetch(path) {
  return fetch(path, { headers: { authorization: `Bearer ${adminToken}` } });
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
