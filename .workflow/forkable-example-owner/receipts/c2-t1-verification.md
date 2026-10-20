Command: workflow execute forkable-example-owner
Created: 2026-10-20
Base:    dc7a942
Inputs:  .workflow/forkable-example-owner/patch_plan.md @ cd29b00
Status:  complete

## C2-T1
- Writer: GPT-6.1 Sol, high. Reuse search found the existing owner-root resolver and canonical path guard; no helper added.
- Freshness: ticket files have no committed changes between cd29b00 and the session's starting HEAD 5752c8f.
- Baseline `npm run check`: exit 0, 302 passed, 3 skipped, 10 static pages passed. The sandbox blocked child processes; permitted execution passed.
- Red checkpoint 3399f99: focused Verify tests exit 1, 25 passed, 4 failed. The evidence selector cannot find the owner's Focus heading in engine data; the local packet cannot find its canonical file; the GitHub packet quotes engine scale 999 instead of owner scale 777; the conversation skill lacks the owner-data path. Production files at this checkpoint match cd29b00.
- Fix dc7a942 changes the two scripts and the conversation skill only. `git diff 3399f99 dc7a942 -- test` is empty.
- Focused Verify: `node --test test/comparison-evidence.test.mjs test/owner-manifests.test.mjs test/project-review.test.mjs test/maintenance-docs.test.mjs`, exit 0, 29 passed.
- Full `npm run check`: exit 0, 303 passed, 3 skipped; 10 static pages passed.
- Evidence mutation: change the catalog source default back to repositoryRoot; owner-manifests exits 1, 7 passed, 1 failed. Restored immediately.
- Review mutation: resolve the canonical file against root instead of ownerRoot; project-review exits 1, 11 passed, 2 failed. Restored immediately.
- Owner-path traversal remains rejected by the manifest validator. The canonical path guard now uses ownerRoot for both resolution and containment.
- Clean clone `/tmp/forkable-c2-clean-cHH37a`: tracked files at 3399f99 plus the exact fix diff, with node_modules linked to the installed dependencies. No ignored owner bundle or sibling owner checkout.
- Clean-clone `AGENT_CV_OWNER_ROOT=examples/owner node scripts/build-comparison-evidence.mjs`: exit 0, 3 items, digest sha256:b01327428c2d90ef0addb645255deb1ac22b8d9353f13df7b0aa63bab4d3eeca.
- Clean-clone `AGENT_CV_OWNER_ROOT=examples/owner npm run check`: exit 0, 294 passed, 12 skipped, Leak scan: 0 findings; 10 static pages passed.
- Logs: `/tmp/forkable-example-owner-{baseline-full,red,green-check,mutation-evidence,mutation-review,clean-check}.log`.
- Existing assertions remain: maintenance-docs 5 to 5, owner-manifests 16 to 17, project-review 40 to 43. The maintenance owner-path assertion now covers both skills. The local canonical fixture moves into owner data as the plan permits; the snapshot fixture now distinguishes owner and engine scale. No assertion removed or weakened.
- Skill change corrects one source-path instruction; invocation, approval and privacy rules remain unchanged. The focused maintenance test and full check pass.
- Try it: no screen changes. The evidence and packet regression tests exercise each maintenance command's exported entry point.
- Noticed: none. Private owner repo untouched. No deployment performed.

## Push and CI
- Pending.
