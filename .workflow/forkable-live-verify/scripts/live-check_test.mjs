import test from "node:test";
import assert from "node:assert/strict";
import { readSseTypes } from "./live-check.mjs";

const delta = "response.output_text.delta";
const completed = "response.completed";
const event = (type, fields = {}) => `event: ${type}\ndata: ${JSON.stringify({ type, ...fields })}\n\n`;
const good = event(delta, { delta: "A short answer." }) + event(completed);

test("sanitized deltas and a final completion pass", () => {
  assert.deepEqual(readSseTypes(good), { types: [delta, completed], answerLength: 15 });
});

for (const [name, stream, error] of [
  ["raw provider type", good + event("response.output_item.added"), /response\.output_item\.added/],
  ["missing completion", event(delta, { delta: "Answer" }), /completion/],
  ["nonfinal completion", good + event(delta, { delta: "Late" }), /completion/],
  ["empty answer", event(completed), /answer/],
  ["raw provider fields", event(delta, { delta: "Answer", response_id: "raw" }) + event(completed), /fields/],
]) {
  test(`rejects ${name}`, () => assert.throws(() => readSseTypes(stream), error));
}
