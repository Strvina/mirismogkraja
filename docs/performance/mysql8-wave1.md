# MySQL 8 measurements — Wave 1

Measured on 9 October 2026 in [GitHub Actions run 37860717102](https://github.com/Strvina/mirismogkraja/actions/runs/37860717102), against commit `f68a09f`. The application ran on PHP 8.2.34 without CLI OPcache, MySQL 8.4.11 and an isolated `vrelina_perf_ci` database. The load-test dataset contains 2,000 producers, 50,000 products, 200,000 messages and 20,000 reviews; all accounts and records are synthetic.

Both index migrations were rolled back and reapplied successfully. All 74 scenarios returned HTTP 200, with zero failed measured requests both before and after. Each scenario uses 10 warm measurements, one cold measurement and two untimed warm-up requests. With ten samples, p95 is the largest sample; one cold sample is a diagnostic, not a stable percentile. Framework boot and connection establishment are outside the timer. Requests are sequential and this does not establish production throughput, concurrent capacity or an SLA.

Raw evidence is preserved in [before](mysql8-wave1-before.json) and [after](mysql8-wave1-after.json). The generated tables below retain the measured values, including small regressions and unchanged query counts. The CI workflow also captures EXPLAIN output in its artifact on subsequent runs.

The admin product list's first-page database time improved from 32.7 to 9.1 ms. The catalogue remains around 100 ms and 190 KB for its first page; the index changes do not resolve the oversized filter payload. The remaining query/controller work is listed in the parent performance document and deferred to Wave 3.

A parallel local WSL run was stopped after the complete CI benchmark succeeded, because Windows was also running browser and PHP tests under memory pressure. Those partial local values are not used here; the local isolated database's indexes were restored afterward.

8.4.11, PHP 8.2.34 without OPcache; 10 timed requests per page with the cache warm, 1 with it emptied.

**Home**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| home page | 16 | 19.8 → 17.7 | 31.8 → 28.4 | 35.5 → 31.5 | 20 | 417 → 347 | 46 |

**Catalogue**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| page 1 | 8 | 82.2 → 83.4 | 98.4 → 99.7 | 106 → 102 | 13 | 183 → 192 | 193 |
| page 100 | 4 | 86.1 → 89 | 101 → 104 | 107 | 9 | 184 → 177 | 187 |
| last allowed page (500) | 4 | 88 → 91.5 | 104 → 106 | 114 → 113 | 9 | 173 → 190 | 186 |
| 100 per page, page 1 | 8 | 82.6 → 83.3 | 108 → 109 | 117 → 120 | 13 | 192 | 256 |
| 100 per page, last page | 4 | 98.9 → 90.7 | 122 → 115 | 126 → 123 | 9 | 197 → 194 | 244 |
| cheapest first, page 1 | 8 | 87.3 → 86.1 | 106 → 103 | 107 → 111 | 13 | 198 → 190 | 193 |
| most expensive first, page 1 | 8 | 90.3 → 87.5 | 107 → 106 | 115 → 110 | 13 | 191 → 197 | 192 |
| cheapest first, page 500 | 4 | 90 → 98.3 | 108 → 113 | 113 → 114 | 9 | 204 → 197 | 186 |
| category filter (Zimnica) | 8 | 119 | 136 → 137 | 176 → 148 | 13 | 220 → 227 | 189 |
| producer filter (busiest) | 6 | 3.2 → 2.4 | 18.3 → 17.1 | 22.1 → 21.5 | 11 | 105 | 186 |
| city filter (Niš) | 8 | 16.2 → 15.6 | 33.6 → 32.5 | 35.6 → 35 | 13 | 107 → 105 | 189 |
| price range 500-1000 | 8 | 111 → 119 | 129 → 137 | 138 → 143 | 13 | 231 → 226 | 193 |
| in stock | 8 | 124 → 129 | 142 → 147 | 150 → 155 | 13 | 223 → 233 | 194 |
| in season | 8 | 132 → 124 | 150 → 141 | 157 → 150 | 13 | 236 → 229 | 193 |
| category + city + in stock, cheapest first | 6 | 18.7 → 18.6 | 34.9 → 33.8 | 41.4 | 11 | 115 → 112 | 187 |
| page 1, signed in (buyer with 1,300 favourites) | 14 | 90.1 → 88.7 | 109 → 107 | 117 → 116 | 20 → 19 | 207 → 190 | 194 |

**Search**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| "ajvar" (about 1,000 matches) | 7 | 16 → 15.8 | 33.3 → 33.5 | 35.9 → 44.5 | 12 | 132 → 115 | 186 |
| "domaći" (a third of the catalogue) | 9 | 107 | 126 → 125 | 129 → 132 | 14 | 222 → 201 | 190 |
| "domaći", page 100 | 4 | 83.2 → 76.5 | 101 → 90.9 | 107 → 96 | 9 | 184 → 180 | 186 |
| "domaći", cheapest first | 9 | 97.4 → 94.4 | 114 → 112 | 121 → 122 | 14 | 215 → 188 | 192 |
| "med" (three letters) | 9 | 55.1 → 49.2 | 72.9 → 66.7 | 79.5 → 71.1 | 14 | 151 → 160 | 191 |
| "šljivovica prepečenica" (two words) | 9 | 7.2 → 7.5 | 23.6 → 23.2 | 27.1 → 24.7 | 14 | 110 → 104 | 187 |
| "od" (too short for the FULLTEXT index) | 9 | 184 → 178 | 203 → 196 | 239 → 203 | 14 | 341 → 259 | 194 |
| "kivi" (no match) | 4 | 1.8 → 2.1 | 13.3 → 16.8 | 16 → 21.9 | 9 | 96.4 → 101 | 169 |
| "ajvar" in a category, in stock | 7 | 15.1 → 16.6 | 30.7 → 33.3 | 38.5 → 51.7 | 12 | 111 → 118 | 187 |

**Category**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Zimnica (with subcategories), page 1 | 10 | 119 → 106 | 139 → 124 | 147 → 129 | 18 | 343 → 340 | 194 |
| Zimnica, last page | 6 | 116 → 108 | 131 → 123 | 146 → 124 | 14 | 350 → 309 | 184 |
| Zimnica, cheapest first | 10 | 109 → 108 | 127 → 126 | 133 → 130 | 18 | 335 → 328 | 193 |
| Ajvar (a subcategory), page 1 | 9 | 104 → 102 | 122 → 119 | 124 → 137 | 17 | 324 → 306 | 192 |
| Voće (no subcategories), page 1 | 10 | 107 → 106 | 125 → 124 | 130 | 18 | 327 → 314 | 192 |

**Producer directory**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| page 1 | 12 | 15.4 → 14.5 | 29.6 → 27 | 32.2 → 36 | 12 | 28 → 27.6 | 62 |
| last page | 7 | 10 → 9.3 | 19.9 → 18.4 | 23.6 → 23.3 | 7 | 23.6 → 22.4 | 47 |
| city filter (Niš) | 12 | 10.4 → 9.7 | 23.6 → 21.8 | 27.3 → 25.7 | 12 | 25.8 → 22.3 | 61 |
| search "jovanović" | 12 | 8.9 → 8.5 | 21.6 → 21 | 26.1 → 25.3 | 12 | 22.4 → 20.3 | 54 |
| nearest to me | 12 | 17.1 → 16.6 | 30.5 → 30.6 | 36.3 → 34.9 | 12 | 30.5 → 29.2 | 62 |

**Producer profile**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| busiest producer (500 products, 750 reviews) | 14 | 7.4 → 6.3 | 18.2 → 16 | 22.8 → 19 | 17 | 224 → 127 | 48 |
| busiest producer, last page of reviews | 14 | 7.6 → 7 | 16.4 → 15.8 | 20.6 → 20 | 17 | 134 → 130 | 42 |
| busiest producer, signed in | 25 | 10.9 → 9.9 | 25 → 22.9 | 30 → 25.2 | 29 | 154 → 139 | 49 |
| ordinary producer | 14 | 4.2 | 14 → 12.9 | 17.1 → 15 | 17 | 103 → 96.1 | 40 |

**Product page**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| a product of the busiest producer | 6 | 3.1 → 2.9 | 9.8 → 9 | 12.7 → 13.8 | 9 | 141 → 127 | 29 |

**Inbox**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| buyer with 280 conversations, page 1 | 12 | 8.6 → 8 | 18.6 → 17.2 | 20.7 → 20.1 | 12 | 37.9 → 18.1 | 36 |
| buyer with 280 conversations, last page | 12 | 8.6 → 7.4 | 17.3 → 14.7 | 20.6 → 17 | 12 | 17.3 → 15.7 | 27 |
| buyer with one conversation | 12 | 3.4 → 3.2 | 11 → 9.7 | 14.7 → 13.5 | 13 → 12 | 17.4 → 11.2 | 21 |
| producer with 1,800 conversations, page 1 | 12 | 31.9 → 31.3 | 42.6 → 41.4 | 43.4 → 42.3 | 13 → 12 | 52.2 → 45.2 | 36 |
| producer with 1,800 conversations, page 30 | 12 | 32.2 → 30.3 | 43.4 → 40 | 47.6 → 44.7 | 12 | 41.5 → 44.1 | 37 |
| producer with 1,800 conversations, last page | 12 | 31.8 → 30.2 | 41.4 → 38.8 | 45.2 → 42.6 | 12 | 41.7 → 38.4 | 28 |

**Thread**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| buyer's side, newest page (20 messages) | 12 | 5.3 → 4.8 | 15.1 → 13.5 | 18.3 → 16.9 | 13 | 18.5 → 16.2 | 29 |
| buyer's side, oldest page | 12 | 5.2 → 4.8 | 15.1 → 13.4 | 19.1 → 16.9 | 13 | 12.7 → 14.4 | 29 |
| producer's side, newest page (312 messages) | 14 | 5.7 → 5.4 | 17.4 → 15.7 | 22.1 → 19.9 | 15 | 23.6 → 17.8 | 39 |
| producer's side, oldest page | 16 | 6.3 → 5.7 | 16.2 → 14.7 | 20.3 → 17.9 | 17 | 16.8 → 14.9 | 26 |

**Header poll**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| unread badges, busiest producer | 5 | 2.7 → 2.5 | 6.4 → 5.9 | 10.5 → 9.3 | 5 | 6.7 → 6.5 | 0 |
| unread badges, buyer with 280 conversations | 5 | 2.8 → 2.5 | 6.4 → 5.6 | 8.7 → 8.6 | 5 | 6.4 → 5.8 | 0 |

**Admin**

| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| dashboard | 25 | 55.3 → 53.8 | 64.9 → 63.3 | 86.6 → 66.7 | 26 → 25 | 302 → 94.1 | 29 |
| users, page 1 | 12 | 14.6 → 14.7 | 28.2 → 27.4 | 30.9 → 30.8 | 12 | 36.6 → 26.3 | 53 |
| users, last page | 12 | 29.4 → 28.7 | 42.2 → 41.8 | 48 → 47.4 | 12 | 40.2 → 40.8 | 49 |
| users, search "jovan" | 12 | 18.5 | 31.6 → 32 | 35.1 → 34.8 | 12 | 34.9 → 32.1 | 54 |
| users, sellers tab | 12 | 17.4 → 16.9 | 33.5 → 31.3 | 47.5 → 35.2 | 12 | 30.1 → 31 | 60 |
| producers, page 1 | 11 | 6.1 → 6.2 | 16.7 → 17 | 24.1 → 20.7 | 11 | 17.4 → 17.6 | 69 |
| producers, last page | 12 | 7.7 → 7.8 | 16.7 → 17.2 | 23.4 → 22.5 | 12 | 16.1 → 16.5 | 43 |
| producers, waiting for approval | 11 | 4.2 | 15.1 → 14.9 | 21.2 → 17.7 | 11 | 17.7 → 15.2 | 68 |
| products, page 1 | 11 | 32.7 → 9.1 | 73.4 → 46.4 | 76.4 → 48 | 11 | 73.9 → 44.8 | 210 |
| products, last page | 11 | 59.3 → 56.3 | 96.2 → 91.6 | 103 → 96.6 | 11 | 94.2 → 96.5 | 211 |
| products, search "ajvar" | 11 | 47.8 → 22.1 | 88.2 → 55.7 | 107 → 58.7 | 11 | 82.7 → 57.4 | 211 |
| products, status active | 11 | 9.3 → 8.5 | 48.7 → 42.2 | 52.3 → 45.2 | 11 | 50.9 → 41.5 | 211 |
| products, of the busiest producer | 11 | 7.8 → 7.1 | 47.3 → 41.6 | 49.1 → 42.9 | 11 | 47.4 → 42.3 | 210 |
| reviews, waiting (default tab) | 10 | 5.3 → 4.9 | 16.2 → 14 | 20 → 17.4 | 10 | 15 → 14.3 | 49 |
| reviews, published, page 1 | 10 | 6.5 → 6.3 | 16.8 → 16.2 | 20.3 → 19.3 | 10 | 18.1 → 16.8 | 51 |
| reviews, published, last page | 10 | 20.2 → 19.7 | 31.2 → 29.4 | 35 → 32.3 | 10 | 34.6 → 33.1 | 48 |
| activity log, page 1 | 7 | 4.9 → 4.6 | 13.3 → 12 | 19.9 → 14.6 | 7 | 13.5 → 12.4 | 42 |
| activity log, last page | 7 | 42.6 → 41.4 | 51.6 → 49.2 | 56.1 → 53.2 | 7 | 51.8 → 50 | 40 |
| activity log, updated products | 7 | 44.7 → 44.8 | 54.8 → 53.4 | 60.6 → 56.8 | 7 | 52.5 → 56.3 | 45 |
| memberships, waiting for payment | 10 | 2.6 → 2.9 | 10.6 → 11.2 | 12.9 → 14.3 | 10 | 10.9 → 11.4 | 44 |
| boosts, waiting for payment | 11 | 3.2 → 3.1 | 12.2 → 11.6 | 14.9 → 14.1 | 11 | 10.8 → 12.8 | 45 |
