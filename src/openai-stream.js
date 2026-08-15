const INTERRUPTED_MESSAGE = "The model stream was interrupted.";
const MAX_EVENT_BUFFER_CHARACTERS = 256 * 1024;
const encoder = new TextEncoder();

export function sanitizeOpenAIResponseStream(upstreamBody, reportDiagnostic = () => {}) {
  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let ended = false;

  return new ReadableStream({
    async pull(controller) {
      if (ended) return;

      try {
        while (!ended) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
          if (buffer.length > MAX_EVENT_BUFFER_CHARACTERS) {
            reportDiagnostic("buffer_limit", "unknown");
            controller.enqueue(encoder.encode(publicErrorEvent()));
            ended = true;
            await cancelReader(reader);
            controller.close();
            return;
          }

          const result = drainEventBlocks(buffer, done, reportDiagnostic);
          buffer = result.remainder;
          for (const event of result.events) controller.enqueue(encoder.encode(event));

          if (result.terminal) {
            ended = true;
            await cancelReader(reader);
            controller.close();
            return;
          }

          if (done) {
            reportDiagnostic("unexpected_eof", "unknown");
            controller.enqueue(encoder.encode(publicErrorEvent()));
            ended = true;
            controller.close();
            return;
          }

          if (result.events.length) return;
        }
      } catch {
        if (ended) return;
        reportDiagnostic("read_error", "unknown");
        controller.enqueue(encoder.encode(publicErrorEvent()));
        ended = true;
        controller.close();
        await cancelReader(reader);
      }
    },

    async cancel() {
      ended = true;
      await cancelReader(reader);
    },
  });
}

function drainEventBlocks(input, final, reportDiagnostic) {
  const events = [];
  let remainder = input;
  let terminal = false;

  while (!terminal) {
    const delimiter = /\r?\n\r?\n/.exec(remainder);
    if (!delimiter) break;
    const block = remainder.slice(0, delimiter.index);
    remainder = remainder.slice(delimiter.index + delimiter[0].length);
    const sanitized = sanitizeEventBlock(block, reportDiagnostic);
    if (sanitized.event) events.push(sanitized.event);
    terminal = sanitized.terminal;
  }

  if (final && !terminal && remainder.trim()) {
    const sanitized = sanitizeEventBlock(remainder, reportDiagnostic);
    if (sanitized.event) events.push(sanitized.event);
    terminal = sanitized.terminal;
    remainder = "";
  }

  return { events, remainder, terminal };
}

function sanitizeEventBlock(block, reportDiagnostic) {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).replace(/^ /, ""))
    .join("\n");
  if (!data) return { event: "", terminal: false };

  let event;
  try {
    event = JSON.parse(data);
  } catch {
    reportDiagnostic("malformed_event", "unknown");
    return { event: publicErrorEvent(), terminal: true };
  }

  if (event.type === "response.output_text.delta" || event.type === "response.refusal.delta") {
    if (typeof event.delta !== "string") {
      reportDiagnostic("invalid_delta", "unknown");
      return { event: publicErrorEvent(), terminal: true };
    }
    return {
      event: publicEvent("response.output_text.delta", { delta: event.delta }),
      terminal: false,
    };
  }

  if (event.type === "response.completed") {
    return { event: publicEvent("response.completed"), terminal: true };
  }

  if (event.type === "response.incomplete") {
    reportDiagnostic("response.incomplete", safeDiagnosticCode(event.response?.incomplete_details?.reason));
    return {
      event: publicEvent("response.incomplete", { message: INTERRUPTED_MESSAGE }),
      terminal: true,
    };
  }

  if (event.type === "error" || event.type === "response.failed") {
    const error = event.type === "error" ? event : event.response?.error;
    const code = safeDiagnosticCode(error?.code);
    reportDiagnostic(event.type, code === "unknown" ? classifyDiagnosticMessage(error?.message) : code);
    return { event: publicErrorEvent(), terminal: true };
  }

  return { event: "", terminal: false };
}

function publicErrorEvent() {
  return publicEvent("error", { message: INTERRUPTED_MESSAGE });
}

function publicEvent(type, fields = {}) {
  return `event: ${type}\ndata: ${JSON.stringify({ type, ...fields })}\n\n`;
}

function safeDiagnosticCode(value) {
  return typeof value === "string" && /^[a-z0-9_.-]{1,64}$/i.test(value) ? value : "unknown";
}

function classifyDiagnosticMessage(value) {
  if (typeof value !== "string") return "unknown";
  const categories = [
    ["quota_or_billing", /quota|billing|credit/i],
    ["authentication", /api key|authentication|unauthorized|invalid key/i],
    ["model_access", /model.*(?:access|exist|not found)|does not exist/i],
    ["rate_limit", /rate limit|too many requests/i],
    ["account_config", /organization|project/i],
    ["provider_internal", /server|internal|try again/i],
    ["safety_policy", /safety|policy|content filter/i],
    ["invalid_request", /parameter|invalid request|unsupported/i],
    ["input_limit", /context|input|token/i],
  ];
  return categories.find(([, pattern]) => pattern.test(value))?.[0] || "unknown";
}

async function cancelReader(reader) {
  try {
    await reader.cancel();
  } catch {
    // The public stream is already closed; upstream cancellation is best effort.
  }
}
