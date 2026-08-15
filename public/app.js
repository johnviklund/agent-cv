import { consumeEventStream } from "./stream.js";
import { renderMarkdown } from "./markdown.js";
import {
  canAddUserTurn,
  messagesForRequest,
  rollbackUnpairedUserTurn,
  storePendingApplication,
  storePendingPrompt,
  takePendingApplication,
  takePendingPrompt,
} from "./chat-state.js";

const state = {
  messages: [],
  sessionId: createSessionId(),
  applicationSlug: "",
  controller: null,
};

const home = document.querySelector("[data-home]");
const homeInput = document.querySelector("[data-initial-input]");
const conversation = document.querySelector("[data-conversation]");
const messageList = document.querySelector("[data-message-list]");
const followups = document.querySelector("[data-followups]");

document.querySelectorAll("[data-prompt]").forEach((control) => {
  control.addEventListener("click", (event) => {
    event.preventDefault();
    const prompt = control.dataset.prompt;
    if (!prompt) return;
    if (home) startConversation(prompt);
    else queuePromptAndGoHome(prompt);
  });
});

document.querySelectorAll("[data-home-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.querySelector("input");
    const prompt = input?.value.trim();
    if (!prompt) return;
    input.value = "";
    if (state.messages.length) askFollowup(prompt);
    else startConversation(prompt);
  });
});

document.querySelectorAll("[data-start-over]").forEach((control) => {
  control.addEventListener("click", resetConversation);
});

followups?.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => askFollowup(button.dataset.followup));
});

document.querySelectorAll("[data-subpage-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.querySelector("input");
    const prompt = input?.value.trim();
    if (prompt) queuePromptAndGoHome(prompt);
  });
});

const contactValue = document.querySelector("[data-contact-value]");
if (contactValue) loadContact(contactValue);

if (home) {
  state.applicationSlug = readPendingApplication();
  const prompt = readPendingPrompt();
  if (prompt) startConversation(prompt);
}

async function startConversation(prompt) {
  if (!prompt || state.controller) return;

  home.classList.add("is-conversation");
  conversation.hidden = false;
  messageList.replaceChildren();
  followups.hidden = true;
  if (homeInput) homeInput.value = "";
  state.messages = [{ role: "user", content: prompt }];

  appendUserMessage(prompt);
  const answer = appendAgentMessage();
  await requestAnswer(answer);
}

async function askFollowup(prompt) {
  if (!prompt || state.controller) return;
  if (!canAddUserTurn(state.messages)) return;
  state.messages.push({ role: "user", content: prompt });
  appendUserMessage(prompt);
  const answer = appendAgentMessage();
  followups.hidden = true;
  await requestAnswer(answer);
}

async function requestAnswer(answer) {
  state.controller = new AbortController();
  setBusy(true);
  const chunks = [];
  const pendingChunks = [];
  let animationFrame = null;
  let hasRenderedText = false;
  const flushAnswer = () => {
    animationFrame = null;
    const pendingText = pendingChunks.join("");
    pendingChunks.length = 0;
    if (!pendingText) return;
    if (hasRenderedText) answer.copy.append(document.createTextNode(pendingText));
    else answer.copy.textContent = pendingText;
    hasRenderedText = true;
  };

  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: state.controller.signal,
      body: JSON.stringify({
        messages: messagesForRequest(state.messages),
        sessionId: state.sessionId,
        source: window.location.pathname,
        applicationSlug: state.applicationSlug || undefined,
      }),
    });

    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      throw new Error(problem.error || "The chat is temporarily unavailable.");
    }

    const turnId = response.headers.get("x-conversation-turn-id");

    await consumeEventStream(response, (text) => {
      chunks.push(text);
      pendingChunks.push(text);
      animationFrame ??= requestAnimationFrame(flushAnswer);
    });

    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      flushAnswer();
    }

    const fullText = chunks.join("");

    if (!fullText.trim()) throw new Error("The agent returned an empty response.");
    state.messages.push({ role: "assistant", content: fullText });
    answer.copy.replaceChildren(renderMarkdown(fullText));
    answer.copy.classList.add("is-formatted");
    answer.copy.classList.remove("is-streaming");
    answer.status.textContent = "Answer complete";
    if (turnId) answer.element.append(createFeedbackControls(turnId));
    showFollowups();
  } catch (error) {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    state.messages = rollbackUnpairedUserTurn(state.messages);
    if (error.name === "AbortError") return;
    answer.element.classList.add("has-error");
    answer.copy.classList.remove("is-streaming");
    answer.status.textContent = "Chat unavailable";
    answer.copy.replaceChildren(
      document.createTextNode(`${error.message} `),
      createLink("Read the full CV instead →", "/cv/"),
    );
  } finally {
    state.controller = null;
    setBusy(false);
  }
}

function createFeedbackControls(turnId) {
  const container = document.createElement("div");
  container.className = "answer-feedback";
  const prompt = document.createElement("span");
  prompt.textContent = "Was this useful?";
  const status = document.createElement("span");
  status.className = "answer-feedback-status";
  status.setAttribute("aria-live", "polite");

  for (const [label, rating] of [["Yes", "helpful"], ["No", "not_helpful"]]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", async () => {
      container.querySelectorAll("button").forEach((control) => { control.disabled = true; });
      status.textContent = "Saving…";
      try {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ turnId, rating }),
        });
        if (!response.ok) throw new Error("Feedback unavailable");
        prompt.textContent = "Thanks — this helps improve the source material.";
        container.querySelectorAll("button").forEach((control) => control.remove());
        status.textContent = "";
      } catch {
        container.querySelectorAll("button").forEach((control) => { control.disabled = false; });
        status.textContent = "Couldn’t save feedback.";
      }
    });
    container.append(button);
  }

  container.prepend(prompt);
  container.append(status);
  return container;
}

function appendUserMessage(prompt) {
  const item = document.createElement("article");
  item.className = "message message-user";
  const label = document.createElement("p");
  label.className = "message-label";
  label.textContent = "YOU";
  const copy = document.createElement("p");
  copy.textContent = prompt;
  item.append(label, copy);
  messageList.append(item);
}

function appendAgentMessage() {
  const element = document.createElement("article");
  element.className = "message message-agent";
  const label = document.createElement("div");
  label.className = "agent-label";
  label.innerHTML = '<span aria-hidden="true"></span><strong>JOHN\'S AGENT</strong>';
  const status = document.createElement("span");
  status.className = "sr-only";
  status.setAttribute("aria-live", "polite");
  status.textContent = "Answer streaming";
  const copy = document.createElement("div");
  copy.className = "answer-copy is-streaming";
  copy.textContent = "Thinking…";
  element.append(label, status, copy);
  messageList.append(element);
  return { element, status, copy };
}

function showFollowups() {
  followups.hidden = !canAddUserTurn(state.messages);
}

function resetConversation() {
  state.controller?.abort();
  state.messages = [];
  state.sessionId = createSessionId();
  state.applicationSlug = "";
  messageList.replaceChildren();
  conversation.hidden = true;
  followups.hidden = true;
  home.classList.remove("is-conversation");
  homeInput?.focus();
}

function setBusy(busy) {
  document.querySelectorAll("[data-chat-control]").forEach((control) => {
    control.disabled = busy;
  });
  document.body.classList.toggle("chat-busy", busy);
}

function queuePromptAndGoHome(prompt) {
  try {
    storePendingPrompt(window.sessionStorage, prompt);
    const applicationSlug = applicationSlugFromPath(window.location.pathname);
    if (applicationSlug) storePendingApplication(window.sessionStorage, applicationSlug);
  } catch {
    // Storage may be unavailable in hardened browser modes; navigation stays private.
  }
  window.location.assign("/");
}

function readPendingApplication() {
  try {
    return takePendingApplication(window.sessionStorage);
  } catch {
    return "";
  }
}

function applicationSlugFromPath(pathname) {
  return pathname.match(/^\/a\/([a-z0-9_-]{10,32})\/?$/i)?.[1]?.toLowerCase() || "";
}

function readPendingPrompt() {
  try {
    return takePendingPrompt(window.sessionStorage);
  } catch {
    return "";
  }
}

async function loadContact(element) {
  try {
    const response = await fetch("/api/contact");
    const { email } = await response.json();
    if (!email) return;
    const link = createLink(email, `mailto:${email}`);
    link.className = "contact-email";
    element.replaceChildren(link);
  } catch {
    // The static fallback remains visible.
  }
}

function createLink(text, href) {
  const link = document.createElement("a");
  link.textContent = text;
  link.href = href;
  return link;
}

function createSessionId() {
  return globalThis.crypto?.randomUUID?.().replaceAll("-", "_")
    || `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
