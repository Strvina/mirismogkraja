# Performance at scale

What the main pages cost with a couple of thousand producers on the site, which indexes that justified, and what only a change in the code can fix. Measured in October 2026 on a developer's machine; read the caveats before the numbers.

## Verified MySQL 8 follow-up

The original measurements below remain a MariaDB/SQLite baseline. The first improvement wave
also measured **MySQL 8.4.11** on GitHub Actions: 74 scenarios, before and after both index
migrations, with no failed requests. See [the MySQL report and raw results](performance/mysql8-wave1.md).
The admin product list's first-page database time fell from 32.7 to 9.1 ms; the catalogue remained
around 100 ms and still sends approximately 190 KB. These are sequential request measurements,
not a production capacity test. The controller/query improvements remain deferred to Wave 3.

## In short

- Query counts are flat: the indexes changed none of them, and a deep page never runs more queries than page 1.
- Five indexes were added. On SQLite they take the admin user list's last page from 2.3 s to 0.13 s, the admin product list's database time from 126 ms to 9 ms, an ordinary producer's page from 85 ms to 33 ms, and make the home page answer at all with an empty cache (over 15 minutes before, 0.5 s after). On MariaDB they turn two queries from a full sort into an index read (44 ms to 0.5 ms, 9.3 ms to 0.6 ms).
- The slowest public page is the catalogue on MariaDB, and no index helps it: the list query sorts all 39,000 public products to show twenty (about 170-240 ms). It is the first item under "Needs changes in application code".

## Data

`php artisan db:seed --class=LoadTestSeeder` (never part of `db:seed`, refused outside `local` and `testing`; fixed seed, so every run writes the same rows; about 35 s on SQLite and 60 s on MariaDB):

| | Rows |
|---|---:|
| producers (1,811 public, 107 waiting, 65 blocked, 17 archived) | 2,000 |
| products (38,998 public; 3 to 500 per producer, median 18) | 50,000 |
| messages (41,187 conversations; 13,149 unread) | 200,000 |
| reviews (17,066 published, 1,952 waiting, 982 rejected) | 20,000 |
| users (3 admins, 1,900 owners, 12,000 buyers) | 13,903 |
| product photos / gallery photos (rows only, no files) | 80,074 / 3,917 |
| favourites / follows | 60,000 / 30,000 |
| notifications / activity log | 60,000 / 60,000 |
| memberships / boosts / inquiry outcomes / closed conversations | 400 / 300 / 8,652 / 387 |

The data is skewed as a real site is: the busiest producer has 500 products, 1,827 conversations and 876 reviews; the busiest buyer 280 conversations and 1,276 favourites; one conversation in 500 runs to hundreds of messages.

## Method

`scripts/perf/measure.php` (the file's header says exactly what is on the clock):

- Each request goes through the HTTP kernel of a **freshly booted application**: every middleware, the controller, the props, the root Blade view. The first-visit HTML response is measured, the heavier of the two kinds. Framework boot (about 33 ms here) and opening the connection are not timed. A signed-in request loads its account inside the timed part.
- Per page: 3 requests with the **cache emptied before each** ("cold"), 2 untimed warm-up requests, then **20 timed requests** with the cache warm. Reported: queries, the median of the time spent in queries, the median and the 95th percentile (the 19th of 20) of the response time, and the response size.
- Sessions in memory and the cache in files, so only the page's own queries are counted. With the default `SESSION_DRIVER=database` and `CACHE_STORE=database` add two queries per request for the session and one per cache read.
- Cached for 10 minutes, and so different cold and warm: the catalogue's filter choices (`catalog:filter-choices:v2`), the places (`places:v2`), a category's price range (`category-prices:{id}`), the home page's rankings and categories. Cached for 6 hours: a producer's response time.
- Plans are `EXPLAIN` on MariaDB and `EXPLAIN QUERY PLAN` on SQLite, of the queries exactly as the page sent them.

Caveats:

- **MariaDB 10.4.28 (XAMPP), not MySQL 8.** There is no Docker on this machine. MySQL 8's optimizer may choose other plans, in particular for item 1 below. CI runs the test suite on MySQL 8, which proves the migrations apply there, not how fast anything is.
- XAMPP's `innodb_buffer_pool_size` is 16 MB; it was raised to 512 MB for the session (`SET GLOBAL`) so that the data fits in memory, as it would on any real server. MySQL's table statistics were refreshed after seeding (`ANALYZE TABLE`, the seeder does it).
- Windows 10, PHP 8.2.4 CLI **without OPcache**, a laptop shared with four other jobs running test suites. **Response times are noisy** and far above what a server with OPcache gives; only compare them within one column. The MariaDB "after" run happened under visibly heavier load: pages no index touches (the catalogue, the dashboard) came out up to twice slower than "before", so on MariaDB the whole-page times say nothing about the indexes. The evidence there is the plans and the single-query times in "Indexes added".
- Reliable: query counts, plans, and single-query times. Noise: whole-page medians and p95, especially on MariaDB.

## Results

Each cell is before → after the index migrations; one value means it did not change. "Cold" is with the cache emptied before the request.

### MariaDB 10.4

10.4.28-MariaDB, PHP 8.2.4 without OPcache; 20 timed requests per page with the cache warm, 3 with it emptied.

**Home**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| home page | 16 | 66.3 → 236 | 117 → 308 | 410 → 1,147 | 20 | 2,506 → 2,316 | 46 |

**Catalogue**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| page 1 | 8 | 273 → 585 | 336 → 715 | 608 → 1,507 | 13 | 621 → 1,074 | 193 |
| page 100 | 4 | 257 → 516 | 318 → 606 | 377 → 797 | 9 | 1,013 → 1,078 | 187 |
| last allowed page (500) | 4 | 268 → 346 | 331 → 413 | 367 → 622 | 9 | 529 → 867 | 186 |
| 100 per page, page 1 | 8 | 282 → 560 | 400 → 762 | 616 → 1,233 | 13 | 732 → 1,254 | 254 |
| 100 per page, last page | 4 | 367 → 1,229 | 466 → 1,420 | 648 → 2,631 | 9 | 785 → 1,412 | 244 |
| cheapest first, page 1 | 8 | 455 → 750 | 527 → 882 | 1,277 → 1,231 | 13 | 1,046 → 1,313 | 192 |
| most expensive first, page 1 | 8 | 384 → 412 | 464 → 631 | 1,052 → 1,128 | 13 | 1,179 → 1,017 | 192 |
| cheapest first, page 500 | 4 | 452 → 358 | 510 → 424 | 914 → 733 | 9 | 828 → 905 | 186 |
| category filter (Zimnica) | 8 | 424 → 449 | 517 → 533 | 1,078 → 891 | 13 | 673 → 925 | 189 |
| producer filter (busiest) | 6 | 9.9 → 7.3 | 79.8 → 98.1 | 131 → 136 | 11 | 456 → 388 | 186 |
| city filter (Niš) | 8 | 37.4 → 45 | 115 → 124 | 186 → 290 | 13 | 773 → 481 | 189 |
| price range 500-1000 | 8 | 770 → 362 | 836 → 445 | 1,575 → 824 | 13 | 883 → 816 | 193 |
| in stock | 8 | 661 → 399 | 727 → 475 | 1,205 → 668 | 13 | 1,779 → 675 | 194 |
| in season | 8 | 507 → 336 | 599 → 427 | 975 → 589 | 13 | 1,296 → 1,131 | 193 |
| category + city + in stock, cheapest first | 6 | 56.7 → 46.1 | 137 → 116 | 250 → 146 | 11 | 479 → 472 | 187 |
| page 1, signed in (buyer with 1,300 favourites) | 14 | 502 → 222 | 587 → 295 | 938 → 442 | 19 | 1,605 → 863 | 194 |

**Search**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| "ajvar" (about 1,000 matches) | 7 | 32.3 → 33 | 103 → 97.2 | 151 → 135 | 12 | 676 → 318 | 186 |
| "domaći" (a third of the catalogue) | 9 | 305 → 243 | 372 → 311 | 467 → 466 | 14 | 648 → 510 | 190 |
| "domaći", page 100 | 4 | 259 → 193 | 318 → 253 | 379 → 304 | 9 | 467 → 497 | 186 |
| "domaći", cheapest first | 9 | 237 → 180 | 304 → 246 | 414 → 328 | 14 | 723 → 511 | 192 |
| "med" (three letters) | 9 | 171 → 181 | 241 → 255 | 417 → 444 | 14 | 525 → 561 | 191 |
| "šljivovica prepečenica" (two words) | 9 | 19.9 → 26.7 | 87.2 → 103 | 101 → 165 | 14 | 418 → 331 | 187 |
| "od" (too short for the FULLTEXT index) | 9 | 580 → 696 | 654 → 775 | 925 → 1,016 | 14 | 807 → 1,210 | 194 |
| "kivi" (no match) | 4 | 4.1 → 8.6 | 54.5 → 70 | 76.3 → 118 | 9 | 329 → 461 | 169 |
| "ajvar" in a category, in stock | 7 | 28.5 → 30.4 | 94.8 → 96.3 | 133 → 125 | 12 | 328 → 429 | 187 |

**Category**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Zimnica (with subcategories), page 1 | 10 | 292 → 214 | 368 → 279 | 490 → 294 | 18 | 1,157 → 752 | 194 |
| Zimnica, last page | 6 | 229 → 236 | 292 → 295 | 377 → 333 | 14 | 1,160 → 875 | 184 |
| Zimnica, cheapest first | 10 | 237 → 290 | 307 → 372 | 356 → 574 | 18 | 836 → 927 | 193 |
| Ajvar (a subcategory), page 1 | 9 | 241 → 345 | 313 → 432 | 395 → 622 | 17 | 940 → 1,148 | 192 |
| Voće (no subcategories), page 1 | 10 | 249 → 215 | 316 → 280 | 448 → 381 | 18 | 953 → 1,160 | 192 |

**Producer directory**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| page 1 | 12 | 75.6 → 62 | 127 → 109 | 169 → 198 | 12 | 132 → 259 | 62 |
| last page | 7 | 38.2 → 33.5 | 72.3 → 66.6 | 92.3 → 83.7 | 7 | 75.7 → 62.5 | 47 |
| city filter (Niš) | 12 | 42.7 → 45.7 | 85.9 → 91.5 | 106 → 111 | 12 | 83.7 → 96.9 | 61 |
| search "jovanović" | 12 | 43.5 → 48.2 | 85.4 → 91.8 | 100 → 115 | 12 | 91.4 → 93.6 | 54 |
| nearest to me | 12 | 59.3 → 62.9 | 105 → 112 | 120 → 138 | 12 | 105 → 107 | 62 |

**Producer profile**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| busiest producer (500 products, 750 reviews) | 14 | 16.9 → 14.3 | 51.5 → 52.6 | 56.9 → 61.3 | 17 | 348 → 525 | 48 |
| busiest producer, last page of reviews | 14 | 18.9 → 55.4 | 49.6 → 98 | 56.2 → 131 | 17 | 355 → 568 | 42 |
| busiest producer, signed in | 25 | 24.3 → 31.8 | 67.9 → 86.1 | 76.2 → 172 | 29 | 398 → 622 | 49 |
| ordinary producer | 14 | 8.4 → 11.1 | 35.5 → 46.5 | 41.5 → 95.5 | 17 | 208 → 251 | 40 |

**Product page**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| a product of the busiest producer | 6 | 3.5 → 10.1 | 19.3 → 32.1 | 26.4 → 43.1 | 9 | 326 → 432 | 29 |

**Inbox**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| buyer with 280 conversations, page 1 | 12 | 15.3 → 48.9 | 43.7 → 91.2 | 51.7 → 122 | 12 | 53.9 → 72 | 36 |
| buyer with 280 conversations, last page | 12 | 13.9 → 22 | 36 → 51.1 | 42.2 → 111 | 12 | 36.2 → 56.9 | 27 |
| buyer with one conversation | 12 | 6.6 → 8.9 | 25 → 33.8 | 32.2 → 40.1 | 12 | 26.6 → 57.9 | 21 |
| producer with 1,800 conversations, page 1 | 12 | 48.6 → 60.8 | 76.1 → 96.3 | 82.8 → 125 | 12 | 79.7 → 94.7 | 36 |
| producer with 1,800 conversations, page 30 | 12 | 48.6 → 59.7 | 77.2 → 94.5 | 84 → 121 | 12 | 79 → 125 | 37 |
| producer with 1,800 conversations, last page | 12 | 48.4 → 59.4 | 72 → 89 | 77.8 → 138 | 12 | 75.7 → 90.2 | 28 |

**Thread**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| buyer's side, newest page (20 messages) | 12 | 9.8 → 31.5 | 35.4 → 82.8 | 44.2 → 162 | 13 | 42.9 → 106 | 29 |
| buyer's side, oldest page | 12 | 9.8 → 35.6 | 35.4 → 79.9 | 46.4 → 211 | 13 | 41.5 → 97.6 | 29 |
| producer's side, newest page (312 messages) | 14 | 10 → 27.2 | 41.6 → 75.6 | 47.5 → 160 | 15 | 46.2 → 98.5 | 39 |
| producer's side, oldest page | 16 | 11.8 → 34.4 | 38.3 → 74.9 | 45.4 → 123 | 17 | 41.7 → 58.3 | 26 |

**Header poll**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| unread badges, busiest producer | 5 | 4.5 → 5.7 | 13.9 → 18.2 | 22.2 → 26.1 | 5 | 13.2 → 25.5 | 0 |
| unread badges, buyer with 280 conversations | 5 | 4.5 → 6.7 | 12.9 → 19.8 | 19.4 → 32.2 | 5 | 14.1 → 21.5 | 0 |

**Admin**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| dashboard | 25 | 154 → 220 | 182 → 257 | 186 → 451 | 25 | 189 → 386 | 29 |
| users, page 1 | 12 | 38.4 → 62.4 | 78.6 → 113 | 85.5 → 152 | 12 | 80.8 → 134 | 53 |
| users, last page | 12 | 86.1 → 142 | 124 → 189 | 145 → 312 | 12 | 127 → 146 | 49 |
| users, search "jovan" | 12 | 46.4 → 58.7 | 87.3 → 109 | 92.9 → 162 | 12 | 85.5 → 111 | 54 |
| users, sellers tab | 12 | 72.6 → 103 | 120 → 176 | 129 → 330 | 12 | 122 → 165 | 60 |
| producers, page 1 | 11 | 12.3 → 55.3 | 45.3 → 112 | 51.1 → 179 | 11 | 46.3 → 84.7 | 69 |
| producers, last page | 12 | 15.2 → 20.1 | 42 → 57 | 48.4 → 88.2 | 12 | 46 → 76.5 | 43 |
| producers, waiting for approval | 11 | 10.5 → 49.1 | 42.8 → 103 | 49.8 → 167 | 11 | 40.5 → 64.5 | 68 |
| products, page 1 | 11 | 55.2 → 60 | 180 → 254 | 188 → 326 | 11 | 182 → 254 | 210 |
| products, last page | 11 | 135 → 349 | 262 → 587 | 275 → 1,173 | 11 | 261 → 342 | 211 |
| products, search "ajvar" | 11 | 92.7 → 109 | 221 → 300 | 227 → 432 | 11 | 218 → 306 | 211 |
| products, status active | 11 | 35.1 → 81.4 | 162 → 334 | 168 → 687 | 11 | 161 → 314 | 211 |
| products, of the busiest producer | 11 | 18.9 → 63.6 | 146 → 303 | 151 → 810 | 11 | 145 → 294 | 210 |
| reviews, waiting (default tab) | 10 | 15.3 → 44.3 | 45.6 → 98 | 53.9 → 190 | 10 | 45.5 → 146 | 49 |
| reviews, published, page 1 | 10 | 23.4 → 57.1 | 55.5 → 104 | 66.8 → 168 | 10 | 57.7 → 103 | 51 |
| reviews, published, last page | 10 | 60.6 → 168 | 90.9 → 263 | 98.4 → 527 | 10 | 92.7 → 121 | 48 |
| activity log, page 1 | 7 | 19 → 25.9 | 42.7 → 62.5 | 48.5 → 94.3 | 7 | 43.2 → 133 | 42 |
| activity log, last page | 7 | 122 → 220 | 146 → 258 | 150 → 428 | 7 | 155 → 283 | 40 |
| activity log, updated products | 7 | 86.1 → 154 | 110 → 190 | 125 → 322 | 7 | 109 → 227 | 45 |
| memberships, waiting for payment | 10 | 6.7 → 17.2 | 33.7 → 58.1 | 39.3 → 246 | 10 | 36.5 → 85.6 | 44 |
| boosts, waiting for payment | 11 | 7.6 → 41.6 | 34.1 → 90 | 38.6 → 174 | 11 | 34.6 → 125 | 45 |

### SQLite

The home page has no "before": with its cache empty it did not answer in 15 minutes (see `producer_messages (product_id)` below).

SQLite 3.39.2, PHP 8.2.4 without OPcache; 20 timed requests per page with the cache warm, 3 with it emptied.

**Home**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| home page | - → 16 | - → 76 | - → 139 | - → 211 | - → 20 | - → 539 | 47 |

**Catalogue**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| page 1 | 8 | 100 → 125 | 155 → 229 | 170 → 410 | 13 | 333 → 598 | 193 |
| page 100 | 4 | 71.1 → 96 | 119 → 205 | 126 → 299 | 9 | 252 → 456 | 187 |
| last allowed page (500) | 4 | 79.6 → 121 | 126 → 236 | 135 → 350 | 9 | 261 → 380 | 186 |
| 100 per page, page 1 | 8 | 101 → 104 | 185 → 237 | 192 → 344 | 13 | 337 → 756 | 255 |
| 100 per page, last page | 4 | 116 → 160 | 192 → 298 | 264 → 399 | 9 | 331 → 495 | 244 |
| cheapest first, page 1 | 8 | 164 → 193 | 222 → 273 | 282 → 387 | 13 | 495 → 669 | 192 |
| most expensive first, page 1 | 8 | 159 → 244 | 217 → 350 | 236 → 441 | 13 | 457 → 700 | 192 |
| cheapest first, page 500 | 4 | 189 → 319 | 239 → 427 | 263 → 577 | 9 | 372 → 738 | 186 |
| category filter (Zimnica) | 8 | 83.2 → 78.4 | 139 → 158 | 160 → 398 | 13 | 279 → 483 | 189 |
| producer filter (busiest) | 6 | 24.4 → 6 | 77.1 → 102 | 79.7 → 188 | 11 | 220 → 319 | 186 |
| city filter (Niš) | 8 | 120 → 142 | 175 → 245 | 198 → 471 | 13 | 322 → 646 | 189 |
| price range 500-1000 | 8 | 99.9 → 102 | 158 → 206 | 177 → 355 | 13 | 294 → 897 | 193 |
| in stock | 8 | 104 → 110 | 164 → 201 | 175 → 293 | 13 | 316 → 540 | 194 |
| in season | 8 | 104 → 103 | 163 → 181 | 250 → 269 | 13 | 313 → 604 | 194 |
| category + city + in stock, cheapest first | 6 | 114 → 98.1 | 170 → 154 | 197 → 209 | 11 | 351 → 491 | 187 |
| page 1, signed in (buyer with 1,300 favourites) | 14 | 107 → 76.4 | 172 → 142 | 185 → 153 | 19 | 372 → 389 | 194 |

**Search**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| "ajvar" (about 1,000 matches) | 7 | 96.1 → 82.6 | 146 → 137 | 171 → 168 | 12 | 301 → 305 | 186 |
| "domaći" (a third of the catalogue) | 9 | 106 → 82.4 | 163 → 143 | 174 → 167 | 14 | 304 → 294 | 191 |
| "domaći", page 100 | 4 | 93.2 → 86.1 | 147 → 144 | 161 → 230 | 9 | 278 → 314 | 187 |
| "domaći", cheapest first | 9 | 165 → 166 | 219 → 237 | 250 → 395 | 14 | 355 → 420 | 192 |
| "med" (three letters) | 9 | 116 → 91.9 | 172 → 170 | 225 → 269 | 14 | 312 → 381 | 192 |
| "šljivovica prepečenica" (two words) | 9 | 113 → 92.9 | 195 → 170 | 253 → 286 | 14 | 361 → 428 | 187 |
| "od" (too short for the FULLTEXT index) | 9 | 127 → 117 | 194 → 197 | 273 → 262 | 14 | 336 → 474 | 194 |
| "kivi" (no match) | 4 | 63.9 → 89 | 105 → 154 | 130 → 230 | 9 | 252 → 382 | 170 |
| "ajvar" in a category, in stock | 7 | 102 → 113 | 155 → 198 | 180 → 256 | 12 | 293 → 357 | 188 |

**Category**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Zimnica (with subcategories), page 1 | 10 | 83.9 → 70.8 | 144 → 155 | 162 → 195 | 18 | 462 → 619 | 194 |
| Zimnica, last page | 6 | 92.6 → 114 | 144 → 186 | 173 → 314 | 14 | 468 → 694 | 184 |
| Zimnica, cheapest first | 10 | 119 → 115 | 179 → 208 | 202 → 324 | 18 | 554 → 661 | 193 |
| Ajvar (a subcategory), page 1 | 9 | 70.9 → 62.9 | 131 → 148 | 150 → 209 | 17 | 441 → 666 | 192 |
| Voće (no subcategories), page 1 | 10 | 81 → 69.5 | 142 → 150 | 167 → 206 | 18 | 516 → 676 | 192 |

**Producer directory**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| page 1 | 12 | 19.9 → 18.8 | 61.5 → 61.8 | 73.1 → 79.4 | 12 | 77.7 → 130 | 62 |
| last page | 7 | 9.7 → 10.2 | 38.4 → 40.1 | 46.8 → 48 | 7 | 42.1 → 47.2 | 48 |
| city filter (Niš) | 12 | 14.7 → 15.8 | 53.8 → 58.6 | 59.6 → 73.9 | 12 | 55.7 → 59.1 | 61 |
| search "jovanović" | 12 | 14.9 → 15.2 | 52.3 → 55.3 | 60.1 → 61.9 | 12 | 54.7 → 61.4 | 55 |
| nearest to me | 12 | 23.6 → 24.2 | 66.3 → 70.4 | 74.8 → 105 | 12 | 76.1 → 73.8 | 63 |

**Producer profile**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| busiest producer (500 products, 750 reviews) | 14 | 30.4 → 10.2 | 62.5 → 42.3 | 73.3 → 49.9 | 17 | 351 → 470 | 48 |
| busiest producer, last page of reviews | 14 | 29.9 → 10.6 | 59.8 → 40.9 | 72.2 → 54.6 | 17 | 351 → 342 | 42 |
| busiest producer, signed in | 25 | 36.6 → 15.7 | 76.7 → 58.3 | 88.2 → 79.7 | 29 | 388 → 358 | 49 |
| ordinary producer | 14 | 56.8 → 5.2 | 84.8 → 33.1 | 101 → 44.5 | 17 | 245 → 183 | 40 |

**Product page**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| a product of the busiest producer | 6 | 26.4 → 2.6 | 43.4 → 20.4 | 51.8 → 30.3 | 9 | 318 → 277 | 29 |

**Inbox**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| buyer with 280 conversations, page 1 | 12 | 73.2 → 76 | 102 → 104 | 116 → 139 | 12 | 109 → 142 | 36 |
| buyer with 280 conversations, last page | 12 | 73.1 → 75.7 | 95.5 → 98.2 | 104 → 106 | 12 | 99.7 → 96.4 | 27 |
| buyer with one conversation | 12 | 60.5 → 64.2 | 79.8 → 84 | 88.2 → 106 | 12 | 80.8 → 83.2 | 21 |
| producer with 1,800 conversations, page 1 | 12 | 50.9 → 47.8 | 79.4 → 76.9 | 90.3 → 82.6 | 12 | 78.1 → 87.5 | 36 |
| producer with 1,800 conversations, page 30 | 12 | 51.7 → 50.3 | 80.7 → 78.7 | 94.2 → 91.2 | 12 | 78.6 → 77.9 | 37 |
| producer with 1,800 conversations, last page | 12 | 51.6 → 48.7 | 75.4 → 73.5 | 81.7 → 78.7 | 12 | 72.2 → 75 | 28 |

**Thread**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| buyer's side, newest page (20 messages) | 12 | 19.2 → 6.7 | 47 → 32.4 | 54.4 → 39.5 | 13 | 52.8 → 38 | 29 |
| buyer's side, oldest page | 12 | 18.7 → 7 | 45 → 34.1 | 52.8 → 41.1 | 13 | 51.8 → 36.1 | 29 |
| producer's side, newest page (312 messages) | 14 | 12 → 10.7 | 44.8 → 43.9 | 52.9 → 54.8 | 15 | 50.4 → 52.5 | 39 |
| producer's side, oldest page | 16 | 23.3 → 12.2 | 51.1 → 41.2 | 60.8 → 60.2 | 17 | 56 → 68.7 | 26 |

**Header poll**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| unread badges, busiest producer | 5 | 6.2 → 5.7 | 15.2 → 16 | 22 → 23.1 | 5 | 15.6 → 20.2 | 0 |
| unread badges, buyer with 280 conversations | 5 | 6 → 5 | 14.9 → 14.6 | 21.7 → 21.2 | 5 | 15 → 14.4 | 0 |

**Admin**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| dashboard | 25 | 57.9 → 47.7 | 82.4 → 75 | 97.6 → 83.7 | 25 | 91.5 → 75.1 | 29 |
| users, page 1 | 12 | 109 → 60.3 | 148 → 99.6 | 158 → 107 | 12 | 149 → 103 | 53 |
| users, last page | 12 | 2,272 → 90.3 | 2,311 → 127 | 2,715 → 134 | 12 | 2,151 → 124 | 48 |
| users, search "jovan" | 12 | 92.3 → 63.8 | 135 → 107 | 149 → 114 | 12 | 141 → 105 | 55 |
| users, sellers tab | 12 | 126 → 97.5 | 171 → 153 | 184 → 174 | 12 | 181 → 192 | 60 |
| producers, page 1 | 11 | 9.9 → 10.2 | 43.2 → 46.3 | 51.1 → 54.6 | 11 | 66.1 → 46.5 | 69 |
| producers, last page | 12 | 20.8 → 21.3 | 47.3 → 48.9 | 52.8 → 56.9 | 12 | 53.4 → 53.7 | 43 |
| producers, waiting for approval | 11 | 7.8 → 6.6 | 42.8 → 40.5 | 48.8 → 49 | 11 | 39.1 → 47.7 | 68 |
| products, page 1 | 11 | 126 → 9.3 | 254 → 135 | 312 → 145 | 11 | 293 → 133 | 210 |
| products, last page | 11 | 283 → 12.5 | 412 → 158 | 465 → 197 | 11 | 433 → 132 | 211 |
| products, search "ajvar" | 11 | 62 → 48.6 | 193 → 235 | 241 → 491 | 11 | 190 → 189 | 211 |
| products, status active | 11 | 12.9 → 16.6 | 142 → 198 | 146 → 293 | 11 | 146 → 202 | 211 |
| products, of the busiest producer | 11 | 10.8 → 13.3 | 140 → 171 | 146 → 201 | 11 | 138 → 200 | 210 |
| reviews, waiting (default tab) | 10 | 8.3 → 10.3 | 37.7 → 52.4 | 45.4 → 72.5 | 10 | 40.5 → 65.9 | 49 |
| reviews, published, page 1 | 10 | 9.4 → 10.8 | 41.8 → 52.2 | 48.1 → 69 | 10 | 42.9 → 71.4 | 51 |
| reviews, published, last page | 10 | 10.9 → 11 | 40.7 → 44.6 | 47.1 → 65 | 10 | 42.2 → 50 | 48 |
| activity log, page 1 | 7 | 6 → 5.4 | 30.1 → 30 | 37.3 → 39.5 | 7 | 31.4 → 36.8 | 42 |
| activity log, last page | 7 | 9.1 → 8.1 | 32 → 31.9 | 40.1 → 37.5 | 7 | 33.4 → 38.5 | 40 |
| activity log, updated products | 7 | 495 → 501 | 521 → 524 | 570 → 588 | 7 | 577 → 568 | 45 |
| memberships, waiting for payment | 10 | 4.9 → 3.9 | 30.6 → 30 | 34.5 → 34.2 | 10 | 30.1 → 29.1 | 44 |
| boosts, waiting for payment | 11 | 5.4 → 4.5 | 31.9 → 33.3 | 39.3 → 45 | 11 | 33.6 → 27.7 | 45 |

## Indexes added

Two migrations, both with `down()`. Each index is there because of a query a measured page runs. The times below are that one query run on its own (median of 9 runs on MariaDB, 5 on SQLite), which is steadier than a whole page.

### `product_images (product_id, order)`

Every list of product cards reads the photos of its products (the catalogue does it twice: the list and the boosted row).

```sql
select id, product_id, path, `order` from product_images where product_id in (/* the 20 products of the page */) order by `order` asc
```

| | Plan before | Plan after | Before | After |
|---|---|---|---:|---:|
| SQLite | `SCAN product_images` + temp B-tree | `SEARCH product_images USING INDEX product_images_product_id_order_index (product_id=?)` + temp B-tree | 23.7 ms | 0.2 ms |
| MariaDB | `range` on `product_images_product_id_foreign`, 40 rows | `range` on `product_images_product_id_order_index`, 40 rows | 0.8 ms | 0.4 ms |

On MariaDB nothing is gained and nothing is lost: the foreign key's own index was already used, and the new one takes its place (MariaDB dropped the old one by itself, so there is still one index on the column). The gain is on SQLite, where the table had no index at all.

### `products (created_at)`

The admin's list of all products with no status chosen, `Admin\ProductController::index`:

```sql
select * from products order by created_at desc limit 25 offset 0
```

| | Plan before | Plan after | Before | After |
|---|---|---|---:|---:|
| MariaDB | `ALL`, 48,517 rows, `Using filesort` | `index` on `products_created_at_index`, 25 rows | 43.9 ms | 0.5 ms |
| SQLite | `SCAN products` + temp B-tree | `SCAN products USING INDEX products_created_at_index` | 171 ms | 0.2 ms |

The last page of the same list (`offset 49975`) is not helped on MariaDB (149 ms before, 187 ms after, the same full sort: the optimizer will not walk 50,000 index entries). That is the offset, see "Needs changes in application code".

### `products (producer_id, status, created_at)`, replacing `(producer_id, status)`

A producer's newest products on their public page, `Marketplace\ProducerController::show`:

```sql
select id, producer_id, name, slug, price, unit, season_from, season_to from products
where producer_id = ? and status = 'active' order by created_at desc limit 24
```

| | Plan before | Plan after | Before | After |
|---|---|---|---:|---:|
| SQLite, producer with 15 products | `SEARCH products USING INDEX products_status_created_at_index (status=?)`: walks every active product, newest first, until it has met this producer's | `SEARCH products USING INDEX products_producer_id_status_created_at_index (producer_id=? AND status=?)` | 57.5 ms | 0.1 ms |
| MariaDB, producer with 500 products | `range` on `products_status_created_at_index`, 24,258 rows | `ref` on the new index, 425 rows, no sort | 9.3 ms | 0.6 ms |
| MariaDB, producer with 15 products | `ref` on `(producer_id, status)` + `Using filesort` | `ref` on the new index, no sort | 0.5 ms | 0.4 ms |

The new index starts with the two columns of the old one, so every query that used the old one uses the new one (checked: the per-producer product count stays index-only), and the old one is dropped.

### `producers (user_id)` and `producer_messages (product_id)`, only where the database does not index foreign keys (SQLite)

MySQL and MariaDB already have both as the foreign keys' own indexes, and the plans above and below show them in use (`households_user_id_foreign`, `producer_messages_product_id_foreign`), so the migration does nothing there. SQLite has neither.

| Query (SQLite) | Plan before | Plan after | Before | After |
|---|---|---|---:|---:|
| Admin user list, page 1: `select ..., (select count(*) from producers where users.id = producers.user_id ...) from users ... limit 50` | `SCAN producers` once per user | `SEARCH producers USING INDEX producers_user_id_index (user_id=?)` | 72.3 ms | 9.0 ms |
| The same, last page | the same | the same | 3,140 ms | 84.5 ms |
| Unread badge on every signed-in page: `... where producer_id in (select id from producers where user_id = ?) and read_at is null` | `SCAN producers` | `SEARCH producers USING INDEX producers_user_id_index` | 4.9 ms | 0.7 ms |
| Home page ranking (`HomeController::popularProductIds`), here cut down to the first 500 products so that it ends: `select products.id, (select count(*) from producer_messages where products.id = producer_messages.product_id) ...` | `SCAN producer_messages` once per product | `SEARCH producer_messages USING COVERING INDEX producer_messages_product_id_index (product_id=?)` | 42,766 ms | 16.7 ms |

Without the index the real home page, which ranks all 39,000 public products, did not answer in 15 minutes on SQLite when its cache was empty; the run was stopped. That is why the SQLite "before" column has no home page.

### Considered and not added

- **The catalogue's own list.** No index fixes it; see the first item below.
- **`products (status, price)`** for "cheapest first". Unused as the query is written (item 3 below).
- **`activity_logs` by action and subject.** The filter's count takes 89 ms on MariaDB, but the three filter combinations would need two more indexes on the table that grows fastest, each paid for on every audited write.
- **`users (name)`.** The admin user list sorts 13,400 rows (17 ms on MariaDB); an index would save that, but the list also needs a tie-break first (item 12).

## Needs changes in application code

Problems an index cannot solve. Nothing here was changed. Query times are MariaDB unless marked.

1. **The catalogue sorts every public product to show twenty (MariaDB).** Routes `/proizvodi`, `/kategorija/{slug}`, and every list built on `Product::scopePublished` (`Marketplace\ProductController::filtered`, `PlaceController`, `SeasonController`). The scope's `whereHas('producer')` becomes a semi-join; MariaDB 10.4 starts from `producers` (plan: `producers ALL` → `products ref`, `Using temporary; Using filesort`), reads all 39,000 public products and sorts them: 167-240 ms for one page, page 1 the same as page 500, and it never uses `(status, created_at)`. The same query with `FORCE INDEX (products_status_created_at_index)` takes 0.8 ms for page 1 and 45 ms for page 500. SQLite keeps `EXISTS` per row and is fast here (0.2 ms). Fix: for the default order call `->forceIndex('products_status_created_at_index')` on the list query (not on its count), or keep a `is_public` flag on products maintained when a producer's status changes, so no join is needed. Not checked on MySQL 8, whose optimizer may choose differently.
2. **A total is counted on every page view.** Same routes, `->paginate()`. `select count(*) ... exists (...)` costs 22-28 ms unfiltered and 76-91 ms with a price, stock, season or category filter (the filter column is not in any index, so every row is read); on SQLite 50-110 ms. Fix: cache the total per filter set for a minute, or `simplePaginate()` where the page count is not shown.
3. **"Cheapest first" cannot use an index as written.** `ProductController::listing` orders by `price asc, id desc`: two directions, which MariaDB 10.4 cannot read from one index, on top of item 1. Measured 158-170 ms. Fix: break ties in the direction of the sort (`price asc, id asc`), add `(status, price)`, and force it as in item 1.
4. **Deep pages are read by OFFSET, and the admin lists have no limit on depth.** Last page: `/admin/proizvodi` 149-187 ms, `/admin/korisnici` 101-126 ms, `/admin/logovi` about 197 ms, `/admin/utisci?status=approved` 42 ms, against 1-17 ms for page 1. The public lists are capped at page 500 by `RefuseDeepPages`; on SQLite page 500 of the catalogue is 16-45 ms against 0.2 ms. Fix: cursor pagination (`cursorPaginate`) for the admin lists, or the same cap.
5. **Every catalogue page carries the whole filter panel.** `ProductController::filterChoices` sends every selling producer (about 1,800 `{id, name}`) and every city with each page: the response is 190-198 KB for 20 cards, and 173 KB for a search that finds nothing. `/admin/proizvodi` is 215 KB: all producers again (`Producer::orderBy('name')->get()`), and `select *` with every product's description. Fix: load the producer list when the filter is opened (`Inertia::optional`) or search it as typed; select the columns the admin table shows. **Task 156:** the catalogue sends the producer names after the page, once per visit to the site (a deferred prop the browser keeps); the admin product list is as it was.
6. **One visitor in ten minutes pays for the cache.** `filterChoices` (5 queries), `Places::all` and `CategoryPrices::for` are recomputed inline when their 10-minute entries expire, and the home page's rankings likewise: the "cold" columns above. Fix: refresh them from the scheduler, or `Cache::flexible()` so a stale value is served while a new one is worked out.
7. **Search falls back to reading every row.** `App\Support\Search::apply`. A word shorter than three letters ("od") is a `LIKE '%…%'` over the catalogue on MariaDB: 155 ms for the count and 236 ms for the list. On SQLite every search is (49-66 ms for the count alone). A common word with the FULLTEXT index ("domaći", a third of the catalogue) is 62 ms for the count and 94 ms for the list, which sorts every match. Fix: drop words under three letters from the query instead of abandoning the index for them; cap what is counted ("more than 1,000 results").
8. **The boosted rows run the whole list again.** `ProductController::listing` (`$featured`) repeats the filtered query with `inRandomOrder()` (13-48 ms; with a search, the search runs twice). `Marketplace\ProducerController::index` computes the rating and counts of every paying producer (plan: 237 rows, three dependent subqueries each, temporary + filesort, 22 ms) to keep six. Fix: draw the ids at random first from the few boosted or paying ids, then load only those cards. **Task 156:** with nothing boosted the catalogue no longer runs the second query; with boosts it is as it was.
9. **All of a reader's favourites are read for every list.** `App\Support\ProductCards::for` plucks every saved product of the signed-in reader (1,276 rows for the heaviest buyer) to mark 20 cards. Fix: `whereIn('favoritable_id', $idsOnThePage)`. **Done in task 156.**
10. **The inbox aggregates every message the user ever exchanged, twice.** `MessageInboxController::threadSummaries`, route `/poruke`: `group by producer_id, buyer_id` over all the user's messages for the count and again for the page; 23 ms each for a producer with 8,600 messages, and it grows with messages, not with the page. On SQLite the buyer's side scans the whole index (30 ms twice for a buyer with one conversation; the query carries `or 0 = 1` when the user owns no producer). Fix: the conversations table already on the project's to-do list (last message id, unread counters per side); until then leave the `orWhereIn` out when there are no producers.
11. **The admin dashboard counts whole tables on every visit.** `Admin\DashboardController::index`, `/admin`: 25 queries; `count(*)` of `producer_messages` 63 ms, distinct conversations 80 ms, products 15 ms; `Review::pending()->count()` runs twice. Fix: cache the totals for a few minutes and reuse the pending count. **Task 156:** the pending reviews are counted once; the totals are not cached, so the dashboard stays exact.
12. **Admin lists without a tie-break.** `Admin\ProductController::index` (`latest()`), `Admin\ReviewController::index`, `AdminMembershipController`, `AdminBoostController` and `Admin\UserController::index` (`orderBy('name')`) order by one column only, against the project's own rule: rows equal in it can repeat or go missing between pages. `UserController::index` also runs a count per tab on every view, two of them through `whereHas('roles')` over all users (21-40 ms each on SQLite). Fix: add `->orderByDesc('id')`; one grouped count. **The tie-break was added in task 153** (twelve admin lists, guarded by `AdminListOrderTest`); the per-tab counts are as they were.
13. **The activity log's filter counts by reading the rows.** `Admin\ActivityLogController::index`, `/admin/logovi?action=…&subject=…`: 89 ms on MariaDB, 310 ms twice on SQLite, through `(subject_type, subject_id)`. Fix: `simplePaginate()` there, or an index once the filter is known to be used.

`docs/scaling.md` says filters and sorting "run in the database on indexed columns"; items 1-3 show where that does not hold yet.

## How to reproduce

```bash
# SQLite
touch database/loadtest.sqlite
export DB_CONNECTION=sqlite DB_DATABASE="$PWD/database/loadtest.sqlite"
php artisan migrate --force
php artisan db:seed --class=LoadTestSeeder        # about 35 s
npm run build                                     # the pages render the built assets
php scripts/perf/measure.php --out=storage/app/perf-after.json
php scripts/perf/report.php storage/app/perf-before.json storage/app/perf-after.json

# MySQL or MariaDB: an empty database of its own, never the site's
export DB_CONNECTION=mysql DB_HOST=127.0.0.1 DB_DATABASE=vrelina_loadtest DB_USERNAME=root DB_PASSWORD=
php artisan migrate --force && php artisan db:seed --class=LoadTestSeeder   # about 60 s
```

For a "before" run, roll the two index migrations back first (`php artisan migrate:rollback --step=2`). `php scripts/perf/measure.php --only="Catalogue" --queries --explain=5` prints every query of the matching pages with the plan of those slower than 5 ms. The seeder refuses to run outside `local` and `testing`, and the script refuses when `APP_ENV` is `production`. Sign in to the seeded site as `admin1@loadtest.test`, `seller1@loadtest.test` or `buyer1@loadtest.test`, password `password`.
