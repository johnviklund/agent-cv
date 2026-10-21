# How this was built

Agent CV uses coding agents to implement changes, run checks, and review patches. The owner chooses public claims, product behavior, and deployment scope. This repository keeps development records alongside the application so readers can inspect those decisions.

## Read a change from decision to proof

Each folder under [`.workflow/`](../.workflow/) records one piece of work. Its brief describes the intended behavior and scope. The plan turns that brief into tickets with acceptance criteria and verification commands. Execution receipts record checks, results, and deviations. Review records track findings and their resolution; a wrap records the finished result.

Start with a completed run's wrap, then follow its plan, review, and receipts for the detail you need. Records include corrected assumptions and failed checks. Git commits and the current tests show the implementation that resulted.

The workflow assigns implementation and review to separate model seats, with different vendors for independent review. Each run records its writers, reviewers, and any fallback. The personal workflow skill that coordinates those phases lives outside this repository; the committed records remain readable without it.

## Keep lessons near the code

[MEMORY.md](../MEMORY.md) indexes the small files in [`memory/`](../memory/). Each entry describes a recurring mistake, when it applies, and the check or rule that addresses it. Agents read relevant entries before making related changes.

[WORKLOG.md](../WORKLOG.md) is a chronological index of completed work. It links outcomes to commits and reviews and records the models used. Use it to find a change, then read that run's records and diff.

## Give agents repository-specific instructions

[AGENTS.md](../AGENTS.md) defines repository constraints, data boundaries, and required checks. The [`.agents/`](../.agents/) directory contains the local maintenance and verification skills:

- Project refresh gathers approved source evidence and asks the owner questions before changing public claims.
- Conversation review reads private candidates and prepares proposals for owner approval.
- Site verification starts an isolated local site and drives visitor flows, saving screenshots and snapshots as evidence.

These skills document how to maintain this application. They complement the tests and build commands in [package.json](../package.json).

## Keep owner data separate

The public repository contains the reusable engine and a fictional example owner. A deployment reads reviewed public and private sources from a separate owner directory. Secrets, conversation exports, review packets, and generated private bundles stay outside Git.

The tracked-file leak check rejects the selected owner's contact email, home-directory paths, private-file hashes, and stray proposal files. CI builds and checks the fictional example owner. Historical receipts describe checks at their recorded commit; they do not establish the current deployment state.

See the [README](../README.md) for design decisions and local setup, or the [user guide](../USERGUIDE.md) to adapt the engine.
