# Vrelina juga: decisions and numbers

A one-page account of what was built, the choices behind it, and what was measured. The
[README](../README.md) says what the site does and how to run it.

## The problem

Small food producers in the south of Serbia (honey, ajvar, cheese, rakija) sell through Viber groups,
Facebook and market stalls. Buyers outside their town cannot find them, and the producers have no
page of their own. The site gives each producer one, and lets a buyer find a product and ask about it.

## Product decisions

- **Inquiries, not a shop.** No cart and no online payment. A buyer sends an inquiry and the two
  agree on quantity, price and delivery in messages on the site. Small producers sell in varying
  quantities, often by agreement, and many cannot take card payments; a checkout would have been
  built for a seller who does not exist.
- **The producer pays, not the buyer**, by bank slip with an IPS QR code that a Serbian banking app
  reads, confirmed by an administrator. No payment provider, no fees, nothing for a producer to sign
  up for.
- **Pages that a search engine can show.** Each category, place and month has an address of its own
  with a title and a description ("domaći med Leskovac"), because that is how buyers look.
- **Three languages from the start** (Serbian, English, Russian), with the Serbian sentence as the
  key, so a missing translation is found by a test and not by a reader.

## Engineering decisions

- **The cheapest server there is.** No queue worker and no Redis in production: work that can wait
  runs after the response is sent, and anything periodic runs from cron. A €5 VPS or a free cloud
  instance is enough. `docs/scaling.md` lists what to switch on when it is not.
- **Thin controllers, rules in services.** Validation, a call, an answer; memberships, boosts,
  statistics and payment slips are in `app/Services`, where they are tested on their own.
- **Authorization through policies, guarded by a test.** A test reads every signed-in route from the
  router (201 routes in all) and sends a stranger, a verified owner of another producer, to each of
  the 53 that belong to somebody. A route added without saying who may use it fails the build.
- **A deployment that cannot leave the site half-updated.** The script checks everything it can
  (local changes, that the commit is on `master` and newer than what runs, files it would overwrite)
  before it takes the site into maintenance mode, and its failure paths are tested against throw-away
  repositories in CI.

## How it is checked

| | |
| --- | --- |
| PHP tests | 628, on SQLite and on MySQL 8 |
| React component tests | 850 (Vitest) |
| Browser tests | 32 (Playwright), 8 of them running axe on 37 pages and 5 dialogs and refused forms, in the light and the dark theme |
| Static analysis | Larastan level 5, TypeScript, ESLint |
| Coverage of the services | 97 %; CI fails under 95 % |
| Mutation testing | 1,700 mutants in the services, about 67 % killed; the escaped ones that changed behaviour in the money code got tests |

Every change since the first wave went through a pull request with these checks green.

## Measured, then changed

- **The catalogue sent every producer's name with every page**, for one filter: 193 KB for twenty
  products at 2,000 producers. The list became a deferred prop that the browser fetches once and
  keeps: **54 KB**, measured on MySQL 8 with the same data. Load-test seeder and scripts are in
  `scripts/perf`, results in `docs/performance.md`.
- **Five indexes** were added where the load test showed they paid off; the admin product list went
  from 32.7 ms to 9.1 ms of database time on MySQL 8. Others that the numbers did not justify were
  left out, and the report says why.
- **A dark theme nobody had looked at.** The accessibility checks found the home page's headings
  at a contrast of 1.2 : 1 for anyone whose phone is set to dark mode; the brand colours now have
  dark values.
- **A bug found by the calendar.** A cancelled upgrade gave the plan behind it its time back in
  seconds, though it had been taken in days, so a membership ended an hour early or late across a
  change of the clocks. The test that caught it only failed once its dates crossed the end of
  October; it now starts on a fixed date.

## What I would do next

Put it live in one town, with the paid options free, and watch one number: inquiries per week and
how many get an answer. The code is ready for far more traffic than the first months can bring;
what is not known yet is whether producers and buyers will use it. Until that number moves, no new
feature.
