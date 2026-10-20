# Generated owner config: regenerate before every reader, and never reformat it by regex
Applies when: a script reads the generated root `wrangler.jsonc` (or any build output derived from the selected owner), or post-processes JSON text to match the owner's bytes.
Root cause: admin setup read a stale config left by another owner and configured the wrong Worker; a regex that compacted short arrays also rewrote `[ 1 ]` inside owner variable strings and could emit invalid JSON.
Fix: call the generator at the start of every command path that reads the output (dev, deploy, check, setup:admin); format by structure, only outside string literals, and test strings that look like arrays.
Evidence: forkable-owner-artifacts C1-1 (1ae2871) · C1-2 (59faacd)
Occurrences: 1 · Last confirmed: 2026-10-19 · Status: active
Enforced by: test/wrangler-config tests and the admin setup test (`npm run check`)
