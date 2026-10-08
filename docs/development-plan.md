# Completion plan

The owner authorized implementation on 9 October 2026 and then instructed us to stop after Wave 1; Waves 2 and 3 are deferred until the next session. Pull request merges and production deployments require separate approval. Work is prepared on branches; existing Claude worktrees and commits are preserved.

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
- [ ] Sanctum REST API v1 and generated OpenAPI documentation; preserve verification, blocking and two-factor authentication.
- [ ] Coverage and Infection for Services/Support, with measured results and additional tests for surviving mutants.
- [ ] Playwright axe checks across visitor, buyer, producer and admin pages; fix serious/critical findings.

## Wave 3

- [ ] Extract queries/presentation from large controllers and address measured performance bottlenecks.
- [ ] Reliable background mail/notifications, Horizon, Pulse, structured logs and dependency health checks.
- [ ] English README, Serbian companion, screenshots, architecture diagram and operational documentation.
- [ ] Final verification and reviewable PRs; no deployment or PR merge without owner approval.

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

Wave 1 is complete; PR #249 is the combined review candidate. Stop here. Do not start Wave 2 or Wave 3 until the owner resumes work. Merging and production deployment remain owner decisions.

## Next-session handoff

Use `codex/wave1-completion` and PR #249 as the Wave 1 review branch. Existing Claude worktrees are preserved. PRs #244 and #248 overlap the carried-forward CI/performance work; they have not been merged or closed. No production deployment has been performed.

When the owner resumes, start with Wave 2 authorization checks and private-route inventory. The API depends on those rules; accessibility and coverage work can be prepared independently. Keep the measured catalogue/filter payload and inbox/controller bottlenecks for Wave 3. Do not repeat the completed Docker, component-test, deployment-fixture or MySQL baseline work.
