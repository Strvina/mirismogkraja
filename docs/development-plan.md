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

- [x] Policy authorization for private reads and writes, including negative tests. Task 150: `PrivateRouteInventoryTest` reads every signed-in route with a record in its address from the router (61 of them), sends a stranger to the 53 that belong to somebody, and fails when a new route is not written down. It found no hole.
- [x] Coverage and Infection for Services/Support, with measured results and additional tests for surviving mutants. Task 154. Coverage of `app/Services` and `app/Support`: **97.0 %** of 1,339 statements; the `coverage` workflow fails under 95 %. Mutation run (Infection 0.32, 25 minutes on CI): 1,700 mutants, 1,132 killed, 562 escaped, 5 timed out, MSI about 67 %. Most of the escaped ones change nothing a person would see (a cast that PHP makes anyway, a `?->` on a relation that is never null, a cache lifetime, the decimals of a number in a log); the ones in the money code that did change behaviour now have tests (`PaymentNoticesTest`, `CoverageGapsTest`). Not killed on purpose: the bounds of the random payment reference and its retry on a collision, which cannot be forced without making the randomness injectable.
- [x] Playwright axe checks across visitor, buyer, producer and admin pages; fix serious/critical findings. Done in `e2e/accessibility.spec.ts` (37 pages, each in the light and in the dark theme since task 151). Not yet covered: pages reached only through a dialog or a filled form.

## Wave 3

- [x] Address measured performance bottlenecks. Task 156: the catalogue's producer filter is a deferred, once-only prop (page 1 measured 193 KB to 54 KB at 2,000 producers), favourites read for the page only, no second list query without boosts, one count less on the admin dashboard. Task 153: every admin list ends its order on `id`. Not done on purpose: forcing an index and caching totals (items 1 to 3 of `docs/performance.md`), which depend on the production database and matter at tens of thousands of products. Moving queries out of large controllers was not done either: no measurement asked for it.
- [x] Structured logs and dependency health checks. Task 157: `/up` fails without the database, the cache, a writable `storage`, or a cron heard from in ten minutes; `php artisan health:check` names each; every log line carries the request's id, route and user id, and a `json` channel exists. Mail stays without a queue worker, by the decision in `CLAUDE_CONTEXT.md` section 8.
- [x] English README, Serbian companion, screenshots, architecture diagram and operational documentation. Task 155: `README.md`, `README.sr.md`, `docs/screenshots/`, `docs/operations.md`.
- [ ] Final verification and reviewable PRs; no deployment or PR merge without owner approval. Every task above went through its own pull request; the deployment itself waits for the owner (server, domain, keys).

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

State on 12 October 2026. Waves 1 to 3 are done, apart from the deployment, which needs the owner. Work branches from `master` and goes back through a pull request to `master`; the owner merges.

Also done since Wave 1: Vite 8 with its plugins (task 158), Inertia 3 on both sides (task 160), and a membership bug (task 159): a cancelled upgrade gave the plan behind it its time back in seconds instead of days, an hour off across a change of the clocks. Its test now starts on a fixed date.

Dependabot proposes updates every Monday. An npm lock file made on Windows can be refused by `npm ci` on the runners (packages of a WebAssembly fallback left out): write it with npm in a Linux container, `docker run --rm -v <repo>:/mirismogkraja -w /mirismogkraja node:22 npm install --package-lock-only`, and check that its `name` is still `mirismogkraja`.

Two assistants may work at the same time only in separate copies of the repository, on tasks that touch different files. Both end by editing this file, so the second pull request to be merged resolves that conflict.

What is left is the owner's: a server and a domain, mail, Turnstile, Sentry and Google keys, the real payment details and prices, the first producers, and a legal reading of the terms and the privacy policy. Then `docs/deploy.md`, and `docs/operations.md` once it is live. Do not repeat the completed Docker, component-test, deployment-fixture, MySQL baseline, accessibility, route-inventory, coverage or mutation work.
