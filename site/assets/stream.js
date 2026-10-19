const INTERRUPTED_MESSAGE = "The model stream was interrupted.";

export function extractTextDelta(block) {
  return parsePublicEvent(block).text;
}

export async function consumeEventStream(response, onText) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const parsed = drainBlocks(buffer, done);
      buffer = parsed.remainder;

      for (const event of parsed.events) {
        if (event.text) onText(event.text);
        completed ||= event.completed;
      }
      if (done) break;
    }
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new Error(INTERRUPTED_MESSAGE);
  }

  if (!completed) throw new Error(INTERRUPTED_MESSAGE);
}

function parsePublicEvent(block) {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).replace(/^ /, ""))
    .join("\n");
  if (!data) return { text: "", completed: false };

  let event;
  try {
    event = JSON.parse(data);
  } catch {
    return { text: "", completed: false };
  }

  if (["error", "response.failed", "response.incomplete"].includes(event.type)) {
    throw new Error(INTERRUPTED_MESSAGE);
  }

  if (event.type === "response.output_text.delta" || event.type === "response.refusal.delta") {
    return { text: typeof event.delta === "string" ? event.delta : "", completed: false };
  }

  return { text: "", completed: event.type === "response.completed" };
}

function drainBlocks(input, final) {
  const events = [];
  let remainder = input;

  while (true) {
    const delimiter = /\r?\n\r?\n/.exec(remainder);
    if (!delimiter) break;
    events.push(parsePublicEvent(remainder.slice(0, delimiter.index)));
    remainder = remainder.slice(delimiter.index + delimiter[0].length);
  }

  if (final && remainder.trim()) {
    events.push(parsePublicEvent(remainder));
    remainder = "";
  }

  return { events, remainder };
}
