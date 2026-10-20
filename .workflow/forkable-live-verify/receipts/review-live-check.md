Command: live-check --get-only
Created: 2026-10-20T21:37:43.541Z
Base: 5c84e80
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
GET /api/health: 200
Health: {"ok":true,"configured":true}
GET /api/admin/conversations: 401
GET /api/admin/stats: 401
Result: PASS

Requests: 8 GETs, 0 POSTs
GET /llms.txt
GET /cv.md
GET /sitemap.xml
GET /AGENTS.md
GET /john-viklund-cv.pdf
GET /api/health
GET /api/admin/conversations
GET /api/admin/stats
