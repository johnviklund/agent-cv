# Ask my agent

A visitor types a question on the home page and starts a conversation with the owner's agent, can ask follow-ups, and can start over. The answer streams from the model; when chat is not configured the visitor sees a clear fallback to the CV.

## Sub-features
- `ask-send` submits the first question and opens the conversation.
- `ask-error` shows `Chat unavailable` and a link to the full CV when the service is not configured.
- `ask-restart` clears the conversation with `Start over`.

## How to get to it (user POV)
- Type in the box on `/` and press `Send question`, or press a starter such as `Summarize my experience`.

## Driving it with control
Preconditions: baseline.
- **Ask.** `control open /`, `control fill --role textbox --name "Ask about" --value "What does John do?"`, `control click --role button --name "Send question"` → the conversation shows `YOU` and your question.
- **Error path (no key).** `control wait --text "Chat unavailable"` → text `The chat service is not configured yet.` and a link `Read the full CV instead`.
- **Second view.** `control api /api/health` → `"configured": false`.
- **Start over.** `control click --role button --name "Start over"` → the conversation hides and the home question box returns.

## Gotchas
- With `OPENAI_API_KEY` set, the answer path is reachable; this map only proves the error path, so say so in the evidence.
- `control api /api/ask` from outside the browser answers 400 or 403 because the origin check wants a browser request: prove chat through the page.
