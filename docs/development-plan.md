# Completion plan

The owner authorized implementation on 9 October 2026 and then instructed us to stop after Wave 1; Waves 2 and 3 are deferred until the next session. Pull requests and production deployments require separate approval. Work is prepared on branches; existing Claude worktrees and commits are preserved.

## Wave 1

- [x] Preserve the Docker/Redis stack, Larastan 5, React component tests and nginx fix.
- [x] Carry forward the unmerged CI/CD and performance commits without merging their PRs.
- [x] Complete deployment safeguards and test them against an isolated repository.
- [x] Fix remembered sign-in, validation feedback, theme subscription and local lint scope.
- [ ] Add tests for authentication, catalogue filters, inquiries and data entry pages.
- [ ] Measure MySQL 8 performance and exercise index migration rollback on an isolated database.
- [ ] Validate the resulting branch with the complete suite.

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

Local PHP 8.2.4 has no GD, zip or coverage driver. WSL was updated to 3.0.1 and Docker Desktop engine 29.8.0 starts after the owner's restart. The project stack is undergoing its first local start. Production credentials, live OAuth checks and legal review remain owner actions. No metric is considered measured until a real run produces it.

## Restart handoff — 9 October 2026

The owner reports that Windows requires a restart after the WSL installation step. Installation success and Docker availability still need verification after restart. Run `wsl --version`, `wsl --status` and `docker info` before attempting container-based checks.

Work is saved on disk on `codex/wave1-completion`. The eight carried-forward CI/CD and performance commits are committed; HEAD is `94df4cf`. Subsequent fixes, tests, the performance workflow and this plan remain uncommitted. Preserve them and the existing `.claude` worktrees. No PR has been merged and no deployment has been performed.

Focused authentication, form-feedback and appearance tests passed (16 tests), and TypeScript checking passed. The catalogue/data-entry run passed three tests and failed one: the Wanted creation test selects the navbar search form through `container.querySelector('form')`. Scope the submission to the Wanted form using its body field or submit button, rerun the tests, then complete the remaining Wave 1 verification. Full-suite results for the current changes are still pending.

Continue Wave 1 with deployment safeguard verification, broader page/form coverage, isolated MySQL performance measurements and full checks. Stop after Wave 1, as subsequently requested by the owner. This handoff does not mark any incomplete task as finished.
