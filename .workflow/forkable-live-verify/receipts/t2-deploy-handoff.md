Command: workflow execute forkable-live-verify
Created: 2026-10-20
Base: bb6f3f4
Inputs: plan.md @ be08f5b; receipts/t1-verification.md @ e87e101
Status: complete

## Approval scope
Runner: agent after approval. The owner approved option `1a` on 2026-10-20, covering push and the full handoff below.
The earlier automatic push rejection is resolved. Push succeeded; the approved preflight then failed before deployment. See `receipts/t2-preflight-failure.md`. No deployment or paid request ran.
Deploy the current cutover engine plus `../agent-cv-private` to Worker `john-viklund-agent-cv`, serving `https://johnviklund.com`. Then run the prepared live check once, including one chat POST and one comparison POST. These consume one request from each monthly cap. Do not retry a paid request without new approval. Read neither admin tokens nor authenticated exports.

## Preflight already completed
T1 is committed at bb6f3f4. The read-only live baseline passed. `npm run build` exited 0 with all checks and Worker dry-run packaging passing. No live deployment or paid request ran. Full logs stay in `/tmp/forkable-live-verify-build.log`.

## Commands after approval
Run in `/home/john/agent-cv`, stopping on any failure. Export the owner root for every command below.

```bash
export AGENT_CV_OWNER_ROOT=../agent-cv-private
npx wrangler deployments status --name john-viklund-agent-cv
npm run sync:owner -- --deploy && npm run build
npm run deploy
npx wrangler deployments status --name john-viklund-agent-cv
node .workflow/forkable-live-verify/scripts/live-check.mjs --out .workflow/forkable-live-verify/receipts/live-verification.md
```

Before deploy, record the previous active Version ID and its traffic percentage from the first status command. Keep logs outside Git in `/tmp/forkable-live-verify-t2/`. The dry run must exit 0 before `npm run deploy` starts. Capture deploy exit status and its Version ID. Before running the full live check, confirm the second status shows that same new Version ID at 100%, different from the previous one. Stop on a version mismatch.

The live script sends 9 GETs and 2 POSTs on success. Its chat uses `source: "live-verify"`. Its comparison uses two fictional role briefs, an Origin header and the consumer's result validator against live evidence. Receipts contain checksums, status codes, event types, answer length and validation results, never transcripts or private source data.

## Receipt and failure handling
Append approval, exact engine commit, private-owner commit and dirty status without file contents, dry-run/deploy exit codes, previous/new Version IDs and the traffic check to `receipts/live-verification.md`. The script records all remaining literal acceptance values there. If an earlier step fails, write a separate failure receipt before stopping. Do not overwrite a failed attempt's receipt.

If the new deployment is unhealthy, the rollback command using the captured previous Version ID is:

```bash
npx wrangler rollback <previous-version-id> --name john-viklund-agent-cv
```

Rollback is conditional on deployment failure and covered by this approval. Confirm its resulting active version and health, record the failure, and stop. No new deployment or paid retry is included.
