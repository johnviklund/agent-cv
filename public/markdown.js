const BLOCK_START = /^(?: {0,3}(?:#{1,3}\s+|```|(?:[-+*]|\d+[.)])\s+|>\s?|(?:-{3,}|\*{3,}|_{3,})\s*$))/;
const INLINE_SPECIAL = new Set(["*", "_", "`", "[", "\\"]);

export function parseMarkdown(markdown) {
  const lines = String(markdown ?? "").replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^ {0,3}```(?:[^`]*)$/);
    if (fence) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^ {0,3}```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code-block", text: code.join("\n") });
      continue;
    }

    const heading = line.match(/^ {0,3}(#{1,3})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      blocks.push({ type: "heading", depth: heading[1].length, children: parseInline(heading[2]) });
      index += 1;
      continue;
    }

    if (/^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    const listItem = matchListItem(line);
    if (listItem) {
      const items = [];
      const ordered = listItem.ordered;
      while (index < lines.length) {
        const item = matchListItem(lines[index]);
        if (!item || item.ordered !== ordered) break;
        items.push(parseInline(item.text));
        index += 1;
      }
      blocks.push({ type: ordered ? "ordered-list" : "unordered-list", items });
      continue;
    }

    if (/^ {0,3}>/.test(line)) {
      const quote = [];
      while (index < lines.length) {
        const match = lines[index].match(/^ {0,3}>\s?(.*)$/);
        if (!match) break;
        quote.push(match[1]);
        index += 1;
      }
      blocks.push({ type: "quote", children: parseInline(quote.join(" ")) });
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !BLOCK_START.test(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", children: parseInline(paragraph.join(" ")) });
  }

  return blocks;
}

export function renderMarkdown(markdown, documentRef = globalThis.document) {
  if (!documentRef) throw new Error("A document is required to render Markdown.");
  const fragment = documentRef.createDocumentFragment();

  for (const block of parseMarkdown(markdown)) {
    let element;
    if (block.type === "heading") {
      element = documentRef.createElement(`h${Math.min(block.depth + 1, 4)}`);
      appendInline(element, block.children, documentRef);
    } else if (block.type === "unordered-list" || block.type === "ordered-list") {
      element = documentRef.createElement(block.type === "ordered-list" ? "ol" : "ul");
      for (const item of block.items) {
        const listItem = documentRef.createElement("li");
        appendInline(listItem, item, documentRef);
        element.append(listItem);
      }
    } else if (block.type === "quote") {
      element = documentRef.createElement("blockquote");
      appendInline(element, block.children, documentRef);
    } else if (block.type === "code-block") {
      element = documentRef.createElement("pre");
      const code = documentRef.createElement("code");
      code.textContent = block.text;
      element.append(code);
    } else if (block.type === "rule") {
      element = documentRef.createElement("hr");
    } else {
      element = documentRef.createElement("p");
      appendInline(element, block.children, documentRef);
    }
    fragment.append(element);
  }

  return fragment;
}

export function parseInline(value) {
  const input = String(value ?? "");
  const tokens = [];
  let text = "";
  let index = 0;

  const flushText = () => {
    if (!text) return;
    tokens.push({ type: "text", text });
    text = "";
  };

  while (index < input.length) {
    if (input[index] === "\\" && INLINE_SPECIAL.has(input[index + 1])) {
      text += input[index + 1];
      index += 2;
      continue;
    }

    if (input[index] === "`") {
      const end = input.indexOf("`", index + 1);
      if (end > index + 1) {
        flushText();
        tokens.push({ type: "code", text: input.slice(index + 1, end) });
        index = end + 1;
        continue;
      }
    }

    const strongMarker = input.slice(index, index + 2);
    if (strongMarker === "**" || strongMarker === "__") {
      const end = input.indexOf(strongMarker, index + 2);
      if (end > index + 2 && input.slice(index + 2, end).trim()) {
        flushText();
        tokens.push({ type: "strong", children: parseInline(input.slice(index + 2, end)) });
        index = end + 2;
        continue;
      }
    }

    if ((input[index] === "*" || input[index] === "_") && canOpenEmphasis(input, index)) {
      const marker = input[index];
      const end = findEmphasisEnd(input, marker, index + 1);
      if (end > index + 1) {
        flushText();
        tokens.push({ type: "emphasis", children: parseInline(input.slice(index + 1, end)) });
        index = end + 1;
        continue;
      }
    }

    if (input[index] === "[") {
      const labelEnd = input.indexOf("](", index + 1);
      const hrefEnd = labelEnd === -1 ? -1 : input.indexOf(")", labelEnd + 2);
      const href = hrefEnd === -1 ? "" : input.slice(labelEnd + 2, hrefEnd).trim();
      if (labelEnd > index + 1 && isSafeHref(href)) {
        flushText();
        tokens.push({
          type: "link",
          href,
          children: parseInline(input.slice(index + 1, labelEnd)),
        });
        index = hrefEnd + 1;
        continue;
      }
    }

    text += input[index];
    index += 1;
  }

  flushText();
  return tokens;
}

export function isSafeHref(href) {
  if (typeof href !== "string" || /[\u0000-\u001f\u007f\s]/.test(href)) return false;
  if ((href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#")) return true;
  return /^https:\/\/[^/]/i.test(href);
}

function matchListItem(line) {
  const match = line.match(/^ {0,3}([-+*]|\d+[.)])\s+(.+)$/);
  if (!match) return null;
  return { ordered: /^\d/.test(match[1]), text: match[2].trim() };
}

function canOpenEmphasis(input, index) {
  const marker = input[index];
  const previous = input[index - 1] ?? "";
  const next = input[index + 1] ?? "";
  if (!next || /\s/.test(next)) return false;
  return marker !== "_" || !/[\p{L}\p{N}]/u.test(previous);
}

function findEmphasisEnd(input, marker, start) {
  let index = start;
  while ((index = input.indexOf(marker, index)) !== -1) {
    const previous = input[index - 1] ?? "";
    const next = input[index + 1] ?? "";
    if (!/\s/.test(previous) && (marker !== "_" || !/[\p{L}\p{N}]/u.test(next))) return index;
    index += 1;
  }
  return -1;
}

function appendInline(parent, tokens, documentRef) {
  for (const token of tokens) {
    if (token.type === "text") {
      parent.append(documentRef.createTextNode(token.text));
      continue;
    }
    if (token.type === "code") {
      const code = documentRef.createElement("code");
      code.textContent = token.text;
      parent.append(code);
      continue;
    }

    const element = documentRef.createElement(
      token.type === "strong" ? "strong" : token.type === "emphasis" ? "em" : "a",
    );
    if (token.type === "link") {
      element.href = token.href;
      if (token.href.startsWith("https://")) {
        element.target = "_blank";
        element.rel = "noopener noreferrer";
      }
    }
    appendInline(element, token.children, documentRef);
    parent.append(element);
  }
}
