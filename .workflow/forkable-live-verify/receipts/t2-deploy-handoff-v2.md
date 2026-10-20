Command: workflow execute forkable-live-verify
Created: 2026-10-20
Base: baff4c1
Inputs: plan.md @ 6614dd1; receipts/t3-verification.md @ 4122e58
Status: complete

## Approval scope
Runner: agent after approval. Fresh approval is pending. The earlier approval ended at the failed preflight recorded in receipts/t2-preflight-failure.md.

Deploy the current committed engine, including T3 at baff4c1, plus the clean ../agent-cv-private owner bundle to Worker john-viklund-agent-cv, serving https://johnviklund.com. Then run the prepared live check once, including one chat POST and one comparison POST. These consume one request from each monthly cap and may create two 90-day records. No paid retry is included. Read neither admin tokens nor authenticated exports.

## Ready for approval
- T3 is committed. Its deploy sync exits 0. The guard still rejects example content in deploy inputs.
- npm run build exits 0 with 326 tests passed, 2 skipped, static checks and Worker dry-run packaging passed. See receipts/t3-verification.md.
- The private owner tree is clean at 15ad8df9c57ed51629b5dec15b71bcc52f7fcac6. Check it again immediately before the dry run and deploy. Stop if dirty or if its commit differs from this approved source.
- No deployment, paid request or rollback ran during T3. Live results remain unverified after the cutover.

## Commands after approval
Run in /home/john/agent-cv and stop on any failure. Keep raw logs outside Git under /tmp/forkable-live-verify-t2-v2/. Record approval and the exact engine and owner commits in the receipt.

```bash
set -e
export AGENT_CV_OWNER_ROOT=../agent-cv-private
owner_status=$(git -C ../agent-cv-private status --porcelain)
test -z "$owner_status"
test "$(git -C ../agent-cv-private rev-parse HEAD)" = 15ad8df9c57ed51629b5dec15b71bcc52f7fcac6
git rev-parse HEAD
git -C ../agent-cv-private rev-parse HEAD
npx wrangler deployments status --name john-viklund-agent-cv
npm run sync:owner -- --deploy && npm run build
owner_status=$(git -C ../agent-cv-private status --porcelain)
test -z "$owner_status"
test "$(git -C ../agent-cv-private rev-parse HEAD)" = 15ad8df9c57ed51629b5dec15b71bcc52f7fcac6
npm run deploy
npx wrangler deployments status --name john-viklund-agent-cv
node .workflow/forkable-live-verify/scripts/live-check.mjs --out .workflow/forkable-live-verify/receipts/live-verification.md
```

Before deploy, record the previous active Version ID and traffic percentage from the first status command. The dry run must exit 0 before deployment. Capture the deploy exit status and new Version ID. Before the live check, confirm the second status shows that new Version ID at 100%, different from the previous one. Stop on any mismatch.

The script sends 9 GETs and 2 POSTs on success. The chat uses source live-verify. The comparison uses two fictional role briefs, an Origin header and the consumer's validator against live evidence. The receipt stores checksums, status codes, event types, answer length and validation results. It stores no transcripts or private source data.

## Receipt and rollback
Append approval, source commits, clean-owner checks, dry-run/deploy exit codes, previous/new Version IDs and traffic percentage to receipts/live-verification.md. The script records the remaining acceptance values. A failure gets a separate receipt; do not overwrite an earlier failed attempt. Do not retry either paid request without new approval.

If the new deployment is unhealthy, this approval covers rollback to the captured previous version:

```bash
npx wrangler rollback <previous-version-id> --name john-viklund-agent-cv
```

Confirm the resulting active version and health, record the failure and stop. No new deployment or paid retry is included.
