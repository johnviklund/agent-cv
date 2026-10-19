import { createLink } from "./dom.js";
import {
  buildConversationReviewBrief,
  CLASSIFICATION_OPTIONS,
  groupConversationCandidates,
  REVIEW_REASON_OPTIONS,
  settleConversationPageRequest,
} from "./conversation-review.js";

let adminToken = "";
let authRequestGeneration = 0;
let applications = [];
let conversationTurns = [];
let reviewCursor = "";
let reviewLoaded = false;
let reviewLoading = false;
let reviewLoadGeneration = 0;
const classifications = new Map();

const authForm = document.querySelector("[data-admin-form]");
const applicationForm = document.querySelector("[data-application-form]");
const applicationList = document.querySelector("[data-application-list]");
const applicationStatus = document.querySelector("[data-application-status]");
const dashboard = document.querySelector("[data-admin-dashboard]");
const statsList = document.querySelector("[data-admin-stats]");
const status = document.querySelector("[data-admin-status]");
const exportButton = document.querySelector("[data-admin-export]");
const reviewFilters = document.querySelector("[data-review-filters]");
const reviewList = document.querySelector("[data-review-list]");
const reviewStatus = document.querySelector("[data-review-status]");
const briefButton = document.querySelector("[data-review-brief]");
const clearReviewButton = document.querySelector("[data-review-clear]");
const loadReviewButton = document.querySelector("[data-review-load]");

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
    applications = data.applications;
    conversationTurns = [];
    reviewCursor = "";
    reviewLoaded = false;
    reviewLoading = false;
    reviewLoadGeneration += 1;
    classifications.clear();
    renderStats(data.stats);
    renderApplications(applications);
    renderConversationReview();
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

reviewFilters?.addEventListener("change", renderConversationReview);

loadReviewButton?.addEventListener("click", async () => {
  if (reviewLoading) return;
  const requestGeneration = reviewLoadGeneration;
  reviewLoading = true;
  updateReviewLoadButton();
  reviewStatus.textContent = "Loading a private archive page…";
  await settleConversationPageRequest({
    load: () => fetchConversationPage(adminToken, reviewCursor),
    isCurrent: () => requestGeneration === reviewLoadGeneration,
    onPage: (page) => {
      conversationTurns.push(...page.records);
      reviewCursor = page.nextCursor;
      reviewLoaded = true;
      renderConversationReview();
    },
    onError: (error) => {
      reviewStatus.textContent = error.message;
    },
    onSettled: () => {
      reviewLoading = false;
      updateReviewLoadButton();
    },
  });
});

reviewList?.addEventListener("change", (event) => {
  const select = event.target.closest("[data-turn-classification]");
  if (!select) return;
  if (select.value) classifications.set(select.dataset.turnClassification, select.value);
  else classifications.delete(select.dataset.turnClassification);
  updateReviewStatus();
});

briefButton?.addEventListener("click", () => {
  try {
    const brief = buildConversationReviewBrief({
      groups: currentReviewGroups(),
      classifications,
      generatedAt: new Date(),
      source: window.location.href,
    });
    downloadPrivateBrief(brief);
    reviewStatus.textContent = "Private review brief downloaded. Open it with Codex locally, then delete it when the review purpose is complete.";
  } catch (error) {
    reviewStatus.textContent = error.message;
  }
});

clearReviewButton?.addEventListener("click", () => {
  classifications.clear();
  renderConversationReview();
  reviewStatus.textContent = "Local classifications cleared. Delete any downloaded review files where you saved them.";
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
    const url = triggerDownload(blob, filename);
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
  applications = (await response.json()).applications;
  renderApplications(applications);
  renderConversationReview();
}

async function fetchConversationPage(token, cursor) {
  const records = [];
  const path = `/api/admin/conversations?limit=250${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
  const response = await adminFetch(path, {}, token);
  if (!response.ok) throw new Error(response.status === 401 ? "That token was not accepted." : "Conversation turns could not be loaded.");
  const body = await response.text();
  for (const line of body.split("\n")) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      // A corrupt export line should not hide the rest of the private archive.
    }
  }
  return {
    records,
    nextCursor: response.headers.get("x-archive-next-cursor") || "",
  };
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

function renderConversationReview() {
  if (!reviewList || !reviewFilters) return;
  const groups = currentReviewGroups();
  if (!reviewLoaded) {
    reviewList.textContent = "Load the first private archive page when you are ready to review conversation content.";
    updateReviewStatus(groups);
    updateReviewLoadButton();
    return;
  }
  if (!groups.length) {
    reviewList.textContent = activeReviewReasons().size
      ? "No archived turns match the selected learning signals."
      : "Select at least one learning signal to browse candidates.";
    updateReviewStatus(groups);
    updateReviewLoadButton();
    return;
  }

  reviewList.replaceChildren(...groups.map((group) => {
    const section = document.createElement("section");
    section.className = "admin-review-application";
    const heading = document.createElement("h3");
    heading.textContent = group.applicationLabel;
    section.append(heading);
    for (const session of group.sessions) section.append(renderReviewSession(session));
    return section;
  }));
  updateReviewStatus(groups);
  updateReviewLoadButton();
}

function activeReviewReasons() {
  return new Set(new FormData(reviewFilters).getAll("reason"));
}

function currentReviewGroups() {
  return groupConversationCandidates(conversationTurns, applications, activeReviewReasons());
}

function renderReviewSession(session) {
  const details = document.createElement("details");
  details.className = "admin-review-session";
  details.open = true;
  const summary = document.createElement("summary");
  summary.textContent = `${formatTimestamp(session.turns[0]?.createdAt)} · ${session.turns.length} candidate ${session.turns.length === 1 ? "turn" : "turns"} · ${session.sessionId}`;
  details.append(summary, ...session.turns.map(renderReviewTurn));
  return details;
}

function renderReviewTurn(turn) {
  const article = document.createElement("article");
  article.className = "admin-review-turn";

  const meta = document.createElement("div");
  meta.className = "admin-review-meta";
  const timestamp = document.createElement("span");
  timestamp.textContent = formatTimestamp(turn.createdAt);
  const reasons = document.createElement("span");
  reasons.textContent = turn.reviewReasons.map((reason) => (
    REVIEW_REASON_OPTIONS.find((option) => option.value === reason)?.label || reason
  )).join(" · ");
  meta.append(timestamp, reasons);

  const questionLabel = document.createElement("h4");
  questionLabel.textContent = "Visitor question";
  const question = document.createElement("p");
  question.className = "admin-review-copy";
  question.textContent = turn.question || "No question was archived.";
  const answerLabel = document.createElement("h4");
  answerLabel.textContent = "Agent answer";
  const answer = document.createElement("p");
  answer.className = "admin-review-copy";
  answer.textContent = turn.answer || "No answer was archived.";

  const field = document.createElement("label");
  field.className = "admin-review-classification";
  field.append(document.createTextNode("Classification"));
  const select = document.createElement("select");
  select.dataset.turnClassification = turn.turnId;
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose one…";
  select.append(placeholder, ...CLASSIFICATION_OPTIONS.map(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }));
  select.value = classifications.get(turn.turnId) || "";
  field.append(select);

  article.append(meta, questionLabel, question, answerLabel, answer, field);
  return article;
}

function updateReviewStatus(groups = currentReviewGroups()) {
  const candidates = groups.flatMap(({ sessions }) => sessions.flatMap(({ turns }) => turns));
  const classified = candidates.filter(({ turnId }) => classifications.has(turnId)).length;
  if (briefButton) briefButton.disabled = !candidates.length || classified !== candidates.length;
  if (clearReviewButton) clearReviewButton.disabled = classifications.size === 0;
  if (!reviewStatus) return;
  if (!reviewLoaded) {
    reviewStatus.textContent = "Conversation content has not been loaded.";
  } else if (candidates.length) {
    reviewStatus.textContent = `${candidates.length} candidate ${candidates.length === 1 ? "turn" : "turns"} · ${classified} classified · ${conversationTurns.length} archive records loaded${reviewCursor ? "; more available" : ""}.`;
  } else {
    reviewStatus.textContent = `${conversationTurns.length} archive records loaded${reviewCursor ? "; more available" : ""}. No candidates selected for a brief.`;
  }
}

function downloadPrivateBrief(brief) {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([brief], { type: "text/markdown;charset=utf-8" });
  const url = triggerDownload(blob, `agent-cv-conversation-review-${date}.md`);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  return url;
}

function updateReviewLoadButton() {
  if (!loadReviewButton) return;
  loadReviewButton.disabled = reviewLoading || (reviewLoaded && !reviewCursor);
  if (reviewLoading) loadReviewButton.textContent = "Loading archive page…";
  else if (!reviewLoaded) loadReviewButton.textContent = "Load conversation candidates";
  else if (reviewCursor) loadReviewButton.textContent = "Load more archive records";
  else loadReviewButton.textContent = "All archive records loaded";
}

function formatTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : "Unknown time";
}
