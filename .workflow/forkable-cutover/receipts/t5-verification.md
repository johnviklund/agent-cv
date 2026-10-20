Command: workflow execute forkable-cutover
Created: 2026-10-20
Base:    636f2d9
Inputs:  .workflow/forkable-cutover/plan.md @ fafec6c
Status:  complete

Reuse: existing maintenance-docs tests and verify-agent-cv control CLI. The two maintenance skills already point to canonical owner paths; no change needed there.
Red: the new documentation check fails on the pre-T5 AGENTS.md legacy sentence. /tmp/forkable-cutover-t5-red.log.
Green: exact Verify exits 0, five tests pass; legacy-text grep has no matches. /tmp/forkable-cutover-t5-verify.log.
Full check with the private owner: exit 0, 320 pass / 2 skipped, ten static pages pass. /tmp/forkable-cutover-t5-check.log.
Tracked identity grep outside history now finds only the intended copyright, maintainer line, upstream slug and scanner regex. The upstream slug in USERGUIDE remains under F6's global exception.
Live recipe: control up with AGENT_CV_OWNER_ROOT=examples/owner; doctor reports all processes healthy and sameRevision true. Open / shows Ada Example. Fill Ask about with What does Ada do?, click Send question, wait Chat unavailable: pass. Snapshot shows Start over, Send follow-up and Read the full CV instead. GET /api/health returns 200, ok true, configured false. Screenshot .verify-evidence/t5-ada-chat.png. AI answer path not verified because no key is configured. control down stops both owned processes.
Mutation: none, documentation ticket; the new deny-list check went red before edits.
Existing assertions unchanged: maintenance-docs 11 -> 15 assertion sites; four new sites verify the cutover wording. Other touched files are documentation only. Trigger descriptions and skill routing unchanged; only the sample question changes to Ada, exercised above.
No production code or visible UI changed. Canonical owner content unchanged.
