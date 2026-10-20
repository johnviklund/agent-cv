Command: live-check full
Created: 2026-10-20T21:20:56.416Z
Base: 5b83471
Inputs: local build/site and live HTTP responses
Status: complete

Target: https://johnviklund.com

GET /llms.txt: 200
/llms.txt: live sha256 5df2fc3bd2cd9c0b6315fbacb0f9c8bc244cb624b771c79e98f34466bf5b5b26 == build/site sha256 5df2fc3bd2cd9c0b6315fbacb0f9c8bc244cb624b771c79e98f34466bf5b5b26
GET /cv.md: 200
/cv.md: live sha256 a4bd02af87232ec6629620ca99ba744683359fd686b4f4970ace047fd5d034a9 == build/site sha256 a4bd02af87232ec6629620ca99ba744683359fd686b4f4970ace047fd5d034a9
GET /sitemap.xml: 200
/sitemap.xml: live sha256 d6efb6bf42263f0d53b9472b238f52b29003169461ee9968448ebb43765836d2 == build/site sha256 d6efb6bf42263f0d53b9472b238f52b29003169461ee9968448ebb43765836d2
GET /AGENTS.md: 200
/AGENTS.md: live sha256 d10d5d9d69c72ce4332878da7325aaca7934276da710dafcdec841a9b7a56407 == build/site sha256 d10d5d9d69c72ce4332878da7325aaca7934276da710dafcdec841a9b7a56407
GET /john-viklund-cv.pdf: 200
PDF: application/pdf; 2 pages; sha256 f03a203513483689bf498f6fe2fb6efb7106d44230c32e6774f54d05a94ac0ef
PDF: live sha256 == build/site sha256 f03a203513483689bf498f6fe2fb6efb7106d44230c32e6774f54d05a94ac0ef
GET /api/health: 200
Health: {"ok":true,"configured":true}
GET /api/admin/conversations: 401
GET /api/admin/stats: 401
GET /evidence.json: 200
POST /api/ask: 200
Ask: text/event-stream; types response.output_text.delta, response.completed; last response.completed; answer 242 characters
POST /api/compare: 200
Compare: validateComparisonResult passed; 2 roles; digest sha256:af32d4296d0ecd325a49e7c1d5adcac546828d7dd6d4f00dfed89d16552511cb
Result: PASS

Requests: 9 GETs, 2 POSTs
GET /llms.txt
GET /cv.md
GET /sitemap.xml
GET /AGENTS.md
GET /john-viklund-cv.pdf
GET /api/health
GET /api/admin/conversations
GET /api/admin/stats
GET /evidence.json
POST /api/ask
POST /api/compare

## Deployment proof
- Approval: owner selected 1a on 2026-10-20 for git push origin main and receipts/t2-deploy-handoff-v2.md, including one chat, one comparison and conditional rollback.
- Push exited 0; origin/main advanced from 4122e58 to 5b83471. The previous automatic push rejection is resolved by this explicit approval.
- Deployed engine: 5b83471b1f0c83c57855d94b036479d36a674b30.
- Private owner: 15ad8df9c57ed51629b5dec15b71bcc52f7fcac6. git status --porcelain was empty before the dry run, immediately before deploy and after verification. The commit matched the approved source at both preflight checks.
- Step 1 deployment status exited 0: previous Version ID 833d10d6-aa9d-4277-a7b5-8dbff3625ed6 at 100%.
- Dry run: sync:owner --deploy exited 0 and copied 6 private files; npm run build exited 0. Checks: 326 tests passed, 2 skipped, 0 failed; static checks passed for 10 pages; Worker dry-run packaging passed.
- npm run deploy exited 0. It generated a 2-page PDF and reported Version ID c082c445-1592-4901-954f-50d7f8ad6b1e.
- Step 4 deployment status exited 0: c082c445-1592-4901-954f-50d7f8ad6b1e at 100%, matching deploy output and different from the previous version.
- Full live-check command exited 0. The literal HTTP, checksum, SSE and comparison results appear above. Exactly 1 chat POST and 1 comparison POST ran; no paid retry or rollback ran.
- GitHub Actions run 39499453520 for engine commit 5b83471 completed successfully: https://github.com/johnviklund/agent-cv/actions/runs/39499453520.
- Raw logs and clean-source checks stay outside Git under /tmp/forkable-live-verify-t2-v2/. No transcript or private source bundle was committed.
