import test from "node:test";
import assert from "node:assert/strict";
import { LIMITS } from "../src/chat-core.js";
import {
  MAX_REQUEST_MESSAGES,
  PENDING_PROMPT_KEY,
  canAddUserTurn,
  messagesForRequest,
  rollbackUnpairedUserTurn,
  storePendingPrompt,
  takePendingPrompt,
  storePendingApplication,
  takePendingApplication,
} from "../public/chat-state.js";

const completedConversation = (messageCount) => Array.from({ length: messageCount }, (_, index) => ({
  role: index % 2 === 0 ? "user" : "assistant",
  content: `message ${index + 1}`,
}));

test("the conversation stays open while request context remains inside the API boundary", () => {
  assert.equal(MAX_REQUEST_MESSAGES, LIMITS.maxMessages);
  assert.equal(canAddUserTurn([]), true);
  assert.equal(canAddUserTurn(completedConversation(20)), true);

  const longConversation = [
    ...completedConversation(20),
    { role: "user", content: "message 21" },
  ];
  const requestContext = messagesForRequest(longConversation);
  assert.equal(requestContext.length, 9);
  assert.equal(requestContext.length < LIMITS.maxMessages, true);
  assert.equal(requestContext[0].content, "message 13");
  assert.equal(requestContext[0].role, "user");
  assert.equal(requestContext.at(-1).content, "message 21");
  assert.equal(requestContext.at(-1).role, "user");
  assert.equal(canAddUserTurn(longConversation), false);
});

test("a failed request rolls back its unpaired user turn and can retry", () => {
  const original = completedConversation(8);
  const pending = [...original, { role: "user", content: "A question that failed" }];
  const recovered = rollbackUnpairedUserTurn(pending);

  assert.deepEqual(recovered, original);
  assert.equal(pending.length, 9, "rollback does not mutate the caller's array");
  assert.equal(canAddUserTurn(recovered), true);
});

test("pending prompts use one-time session storage instead of navigation URLs", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };

  assert.equal(storePendingPrompt(storage, "  Tell me about Product Studio.  "), true);
  assert.equal(values.get(PENDING_PROMPT_KEY), "Tell me about Product Studio.");
  assert.equal(takePendingPrompt(storage), "Tell me about Product Studio.");
  assert.equal(values.has(PENDING_PROMPT_KEY), false);
  assert.equal(takePendingPrompt(storage), "");
});

test("application context uses a validated one-time session value", () => {
  const storage = memoryStorage();
  assert.equal(storePendingApplication(storage, "application_1234"), true);
  assert.equal(takePendingApplication(storage), "application_1234");
  assert.equal(takePendingApplication(storage), "");
  assert.equal(storePendingApplication(storage, "https://example.com/bad"), false);
});

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
