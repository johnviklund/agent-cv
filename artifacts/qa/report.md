# Dogfood Report: Agent CV

| Field | Value |
|-------|-------|
| **Date** | 2026-08-15 |
| **App URL** | http://127.0.0.1:4173/ |
| **Session** | agent-cv-qa-d80db61e5693 |
| **Scope** | Home, chat handoffs, all subpages, mobile navigation, responsive layout, console, WCAG A/AA automation |

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| **Total** | **0** |

## Issues

No confirmed issues.

## Verified flows

- Starter 02 opens a new pre-seeded conversation in place without adding the prompt to the URL.
- Project action links and project forms transfer prompts through session storage and open a fresh conversation at `/`.
- Experience, Projects, About, Full CV, and Contact pages load without browser errors.
- The 390×844 home, project, and conversation layouts have no horizontal overflow.
- The mobile disclosure opens the complete primary navigation and remains keyboard/assistive-technology exposed.
- Axe-core reported zero WCAG 2 A/AA violations on the home, projects, and conversation states. Contrast checks were marked incomplete because the page background is a gradient and were visually reviewed.

## Evidence

- `screenshots/home-desktop.png`
- `screenshots/chat-starter-2.png`
- `screenshots/projects-desktop.png`
- `screenshots/project-chat-handoff.png`
- `screenshots/contact-desktop.png`
- `screenshots/home-mobile.png`
- `screenshots/projects-mobile.png`
- `screenshots/chat-mobile.png`

## Notes

The retained `issue-001-*` captures document a rejected false positive. A text locator could not target the closed mobile disclosure, but a real pointer interaction opened it correctly and the accessibility tree/audit confirmed the control and navigation.
