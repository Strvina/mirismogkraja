# Completion plan

Two assistants take turns on this project (Claude Code and Codex), in the same working folder, never at the same time. This file and section 10 of `CLAUDE_CONTEXT.md` are the handoff: whoever ends a session updates both and leaves the work pushed on a branch with a pull request.

Wave 1 was merged on 9 October 2026 with the owner's approval. Production deployment still requires the owner.

## Wave 1

- [x] Preserve the Docker/Redis stack, Larastan 5, React component tests and nginx fix.
- [x] Carry forward the unmerged CI/CD and performance commits without merging their PRs.
- [x] Complete deployment safeguards and test them against an isolated repository.
- [x] Fix remembered sign-in, validation feedback, theme subscription and local lint scope.
- [x] Add tests for authentication, catalogue filters, inquiries and data entry pages.
- [x] Measure MySQL 8 performance and exercise index migration rollback on an isolated database.
- [x] Validate the resulting branch with the complete suite.

## Wave 2

- [ ] Policy authorization for private reads and writes, including negative tests.
- [ ] Coverage and Infection for Services/Support, with measured results and additional tests for surviving mutants.
- [x] Playwright axe checks across visitor, buyer, producer and admin pages; fix serious/critical findings. Done in `e2e/accessibility.spec.ts` (37 pages, the public ones also in the dark theme). Not yet covered: pages reached only through a dialog or a filled form, and the dark theme for signed-in pages.

## Wave 3

- [ ] Extract queries/presentation from large controllers and address measured performance bottlenecks.
- [ ] Reliable background mail/notifications, structured logs and dependency health checks.
- [ ] English README, Serbian companion, screenshots, architecture diagram and operational documentation.
- [ ] Final verification and reviewable PRs; no deployment or PR merge without owner approval.

## Only when something needs it

Claude's review moved these out of the waves; the owner left the choice to it. The site has never been live, so each would be code to maintain with nobody using it.

- Sanctum REST API v1 with OpenAPI documentation: when there is a client for it (a mobile app, a partner).
- Horizon and Pulse: when the site is live and the queue or the load is worth watching. Until then the database queue and Sentry cover it.

## Environment

Local PHP 8.2.4 has no GD, zip or coverage driver. WSL was updated to 3.0.1 and Docker Desktop engine 29.8.0 starts after the owner's restart. The project stack and its smoke checks passed; PHP tests in the container pass with GD. Production credentials, live OAuth checks and legal review remain owner actions. No metric is considered measured until a real run produces it.

## Verified Wave 1 evidence

- Review PR: https://github.com/Strvina/mirismogkraja/pull/249; base `improve/integration`. Current-head CI results are attached to its checks.
- `f68a09f`: all ten CI jobs passed, including backend SQLite/MySQL, browser, Vitest, quality, both audits, Docker, deployment safeguard fixtures and MySQL performance.
- Local PHP: 601 tests, 5,565 assertions, 3 GD-dependent skips. Docker PHP: 601 passed, 5,568 assertions, zero skips.
- Local frontend: all 849 tests in 87 files passed, including the final producer/wanted/profile additions. TypeScript, Prettier and ESLint passed.
- MySQL 8.4.11: 74 scenarios before and after the indexes, zero failed measured requests; raw results and report are in `docs/performance/`. The parallel local benchmark was stopped after the CI run succeeded and the isolated local database's indexes were restored.
- Local Windows browser run without OPcache: 23 passed, one 30-second timeout in the wanted-ad buyer/producer/admin chain; isolated retry also timed out near the final admin sign-in. With temporary process-only OPcache (`opcache.enable_cli=1`, timestamp validation on), all 24 passed in 4.1 minutes, without retries. CI also passed all 24 tests. No global PHP configuration or test timeout was changed.
- Linux deployment fixtures and actionlint passed. Git Bash smoke checks passed after fixing Windows curl output/cookie paths.

## Next-session handoff

PR #249 is merged into `improve/integration`; #244 and #248 were closed without merging, because #249 carried their commits unchanged. Before the merge Claude reviewed it and changed two things: the four forms share `FormErrors` instead of four copies of the same block, and the `performance` workflow no longer runs on every migration, only when the measuring changes or by hand.

The accessibility item of Wave 2 is done (task 148, its own pull request against `improve/integration`). It found the dark theme unreadable on the home page: the brand colours had no dark values. They have now; see `docs/design-tokens.md`.

Next: Wave 2 authorization. The app already has five policies and about 110 checks in controllers, and task 146 reviewed them, so start with the inventory of private routes and negative tests for what has none, not with a rewrite. Coverage work can be prepared independently. Keep the measured catalogue/filter payload and inbox/controller bottlenecks for Wave 3. Do not repeat the completed Docker, component-test, deployment-fixture or MySQL baseline work.
