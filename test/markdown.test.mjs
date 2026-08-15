import test from "node:test";
import assert from "node:assert/strict";
import { isSafeHref, parseInline, parseMarkdown } from "../public/markdown.js";

test("parses compact response Markdown into semantic blocks", () => {
  const blocks = parseMarkdown([
    "A short **direct answer** with *measured emphasis*.",
    "",
    "- **Product Studio** — Governed agent work.",
    "- `workflow` — Cross-vendor methodology.",
  ].join("\n"));

  assert.equal(blocks[0].type, "paragraph");
  assert.equal(blocks[0].children[1].type, "strong");
  assert.equal(blocks[0].children[3].type, "emphasis");
  assert.equal(blocks[1].type, "unordered-list");
  assert.equal(blocks[1].items.length, 2);
  assert.equal(blocks[1].items[0][0].type, "strong");
  assert.equal(blocks[1].items[1][0].type, "code");
});

test("supports headings, numbered lists, quotes, and fenced code", () => {
  const blocks = parseMarkdown([
    "## Relevant experience",
    "1. Strategy",
    "2. Delivery",
    "> Grounded in the CV.",
    "```text",
    "safe output",
    "```",
  ].join("\n"));

  assert.deepEqual(blocks.map(({ type }) => type), [
    "heading",
    "ordered-list",
    "quote",
    "code-block",
  ]);
  assert.equal(blocks[3].text, "safe output");
});

test("keeps HTML as text and rejects unsafe Markdown link protocols", () => {
  const tokens = parseInline('<img src=x onerror=alert(1)> [click](javascript:alert(1)) [CV](/cv/)');
  assert.equal(tokens.some((token) => token.type === "link" && token.href.startsWith("javascript:")), false);
  assert.equal(tokens.at(-1).type, "link");
  assert.equal(tokens.at(-1).href, "/cv/");
  assert.equal(isSafeHref("javascript:alert(1)"), false);
  assert.equal(isSafeHref("//evil.example"), false);
  assert.equal(isSafeHref("https://example.com/work"), true);
});
