# Database

Generated from the migrated schema. It describes what the migrations build; the migrations in `database/migrations` are the source of truth.

Framework tables are left out: `migrations`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `sessions`, `password_reset_tokens`, and Spatie's `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions`.

## users

Accounts. A user can be a buyer, the owner of one or more producers (seller), an admin, or several at once (roles via Spatie). Deleting an account soft-deletes it and clears its personal details.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `name` | string |  |  |
| `email` | string |  |  |
| `email_verified_at` | datetime | yes |  |
| `password` | string | yes |  |
| `remember_token` | string | yes |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |
| `phone` | string | yes |  |
| `avatar_path` | string | yes |  |
| `address` | string | yes |  |
| `city` | string | yes |  |
| `lat` | numeric | yes |  |
| `lng` | numeric | yes |  |
| `blocked_at` | datetime | yes |  |
| `deleted_at` | datetime | yes |  |
| `notify_messages_by_email` | tinyint(1) |  |  |
| `locale` | string | yes |  |
| `google_id` | string | yes | Google's permanent id for the account, when it signs in with Google |

Indexes: unique (email); unique (google_id)

`password` is empty for an account opened with Google until its owner sets one.

## producers

A producer's public page: name, story, contact, location, delivery methods, cover and logo. `status` is pending → active (approved by an admin) or blocked. Soft-deleted when archived.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `user_id` | integer |  | → users.id (cascade) |
| `name` | string |  |  |
| `slug` | string |  |  |
| `description` | text | yes |  |
| `address` | string | yes |  |
| `city` | string | yes |  |
| `lat` | numeric | yes |  |
| `lng` | numeric | yes |  |
| `cover_image_path` | string | yes |  |
| `logo_path` | string | yes |  |
| `status` | string |  |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |
| `delivery_methods` | text | yes |  |
| `phone` | string | yes |  |
| `contact_email` | string | yes |  |
| `story` | text | yes |  |
| `deleted_at` | datetime | yes |  |
| `founding_number` | integer | yes |  |
| `referral_code` | string | yes | the producer's referral link; made on first use |
| `founding_joined_at` | datetime | yes |  |
| `verified_at` | datetime | yes |  |
| `paused_at` | datetime | yes | set while the producer takes no new inquiries (sold out, away) |
| `paused_until` | date | yes | the day they said they are back; the pause ends by itself after it |
| `pause_note` | string | yes | what visitors read during the pause (200) |

Indexes: (status, name); unique (founding_number); unique (referral_code); (city); unique (slug)

## products

A producer's products. `status`: draft, active, archived (owner) or blocked (admin only). `published_at` is when it first went public; `season_from`/`season_to` are months.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `producer_id` | integer |  | → producers.id (cascade) |
| `category_id` | integer |  | → categories.id |
| `name` | string |  |  |
| `slug` | string |  |  |
| `description` | text | yes |  |
| `price` | numeric |  |  |
| `unit` | string |  |  |
| `stock_quantity` | integer |  |  |
| `status` | string |  |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |
| `published_at` | datetime | yes |  |
| `season_from` | integer | yes |  |
| `season_to` | integer | yes |  |

Indexes: (status, created_at); unique (slug); (producer_id, status); (category_id, status)

## product_images

Photos of a product; `order` 0 is the main one.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `product_id` | integer |  | → products.id (cascade) |
| `path` | string |  |  |
| `order` | integer |  |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

## producer_images

The producer's gallery.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `producer_id` | integer |  | → producers.id (cascade) |
| `path` | string |  |  |
| `caption` | string | yes |  |
| `order` | integer |  |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

Indexes: (producer_id, order)

## producer_markets

"Gde me nađete": a market, fair or shop where the producer sells in person, and on which days. At most 8 per producer.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `producer_id` | integer |  | → producers.id (cascade) |
| `name` | string |  |  |
| `city` | string | yes |  |
| `days` | json |  | ISO weekdays, 1 (Monday) to 7 (Sunday) |
| `opens_at` | time | yes |  |
| `closes_at` | time | yes |  |
| `note` | string | yes |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

Indexes: (producer_id)

## producer_certificates

Documents behind what a producer claims (organic, protected origin, registered farm, award). `status` is pending → approved or rejected by an admin; only approved ones still in date show on the public page, as a line of text. The file is on the private disk and is sent only to its producer and to admins. At most 10 per producer; deleting the row deletes the file.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `producer_id` | integer |  | → producers.id (cascade) |
| `type` | string |  | one of `ProducerCertificate::TYPES` |
| `title` | string |  |  |
| `issuer` | string | yes |  |
| `issued_on` | date | yes |  |
| `expires_on` | date | yes |  |
| `file_path` | string |  | on the private `local` disk |
| `status` | string |  | pending, approved, rejected |
| `rejection_reason` | string | yes |  |
| `reviewed_by` | integer | yes | → users.id (set null) |
| `reviewed_at` | datetime | yes |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

Indexes: (producer_id, status); (status, created_at); (reviewed_by)

## posts

Stories and recipes written by producers. `status` is draft or published (the author's choice) or blocked (an admin's; the author cannot lift it). Public only while published and while the producer is active. `published_at` is set the first time it is published. A renamed post keeps its old address through `slug_redirects`.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `producer_id` | integer |  | → producers.id (cascade) |
| `type` | string |  | story, recipe |
| `title` | string |  |  |
| `slug` | string |  |  |
| `excerpt` | string | yes | the opening of `body`, written on save |
| `body` | text |  | plain text |
| `ingredients` | text | yes | recipes only, one per line |
| `cover_image_path` | string | yes |  |
| `product_id` | integer | yes | → products.id (set null) |
| `status` | string |  | draft, published, blocked |
| `published_at` | datetime | yes |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

Indexes: unique (slug); (status, published_at); (producer_id, status, published_at); (product_id)

## categories

Product categories, with a public page each (`/kategorija/{slug}`).

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `parent_id` | integer | yes | → categories.id (set null) |
| `name` | string |  |  |
| `slug` | string |  |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

Indexes: unique (slug)

## producer_messages

Messages between a buyer and a producer. A conversation is the pair (`producer_id`, `buyer_id`); `product_id` marks an inquiry sent from a product page. `emailed_at` records the "you have a message" e-mail.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `producer_id` | integer |  | → producers.id (cascade) |
| `buyer_id` | integer |  | → users.id (cascade) |
| `sender_id` | integer |  | → users.id (cascade) |
| `body` | text |  |  |
| `read_at` | datetime | yes |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |
| `product_id` | integer | yes | → products.id (set null) |
| `emailed_at` | datetime | yes |  |

Indexes: (read_at, emailed_at, created_at); (producer_id, read_at); (buyer_id, read_at); (producer_id, buyer_id, created_at)

## quick_replies

A producer's saved answers for the message box. At most 12 per producer; `{ime}` in the body stands for the buyer's name.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `producer_id` | integer |  | → producers.id (cascade) |
| `title` | string |  |  |
| `body` | text |  |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

Indexes: (producer_id)

## conversation_blocks

A closed conversation and which side closed it.

| Column | Type | Null | Notes |
|---|---|---|---|
| `producer_id` | integer |  | primary key → producers.id (cascade) |
| `buyer_id` | integer |  | primary key → users.id (cascade) |
| `created_at` | datetime |  |  |
| `blocked_by` | string |  |  |

## inquiry_outcomes

The producer's own note on how a conversation ended.

| Column | Type | Null | Notes |
|---|---|---|---|
| `producer_id` | integer |  | primary key → producers.id (cascade) |
| `buyer_id` | integer |  | primary key → users.id (cascade) |
| `status` | string |  |  |
| `product_id` | integer | yes | → products.id (set null) |
| `updated_at` | datetime |  |  |

Indexes: (status, updated_at)

## reviews

A buyer's review of a producer, moderated (pending → approved / rejected), with an optional photo and the producer's public reply.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `user_id` | integer |  | → users.id (cascade) |
| `producer_id` | integer |  | → producers.id (cascade) |
| `rating` | integer |  |  |
| `comment` | text | yes |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |
| `image_path` | string | yes |  |
| `status` | string |  |  |
| `approved_at` | datetime | yes |  |
| `reply` | text | yes |  |
| `replied_at` | datetime | yes |  |

Indexes: (status, created_at); (producer_id, status, created_at); unique (user_id, producer_id)

## favorites

Saved products (polymorphic: `favoritable_type` is `product` or `producer`).

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `user_id` | integer |  | → users.id (cascade) |
| `favoritable_type` | string |  |  |
| `favoritable_id` | integer |  |  |
| `created_at` | datetime |  |  |

Indexes: unique (user_id, favoritable_id, favoritable_type); (favoritable_type, favoritable_id)

## producer_follows

Buyers following a producer, told about new products.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `user_id` | integer |  | → users.id (cascade) |
| `producer_id` | integer |  | → producers.id (cascade) |
| `created_at` | datetime |  |  |

Indexes: (producer_id); unique (user_id, producer_id)

## product_alerts

"Javi mi kad stigne": a buyer waiting for a product to be back in stock or in season. Deleted once answered.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `user_id` | integer |  | → users.id (cascade) |
| `product_id` | integer |  | → products.id (cascade) |
| `created_at` | datetime |  |  |

Indexes: (product_id); unique (user_id, product_id)

## reports

Reports of a producer, product or user, for the admins (polymorphic `reportable`).

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `reported_by` | integer |  | → users.id (cascade) |
| `reportable_type` | string |  |  |
| `reportable_id` | integer |  |  |
| `reason` | string |  |  |
| `message` | text | yes |  |
| `status` | string |  |  |
| `reviewed_by` | integer | yes | → users.id (set null) |
| `reviewed_at` | datetime | yes |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

Indexes: unique (reported_by, reportable_type, reportable_id); (status, created_at); (reportable_type, reportable_id)

## producer_change_requests

Changes an owner may ask for but not make alone (a published producer's name), waiting for an admin.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `producer_id` | integer |  | → producers.id (cascade) |
| `requested_by` | integer |  | → users.id (cascade) |
| `field` | string |  |  |
| `current_value` | text | yes |  |
| `requested_value` | text |  |  |
| `status` | string |  |  |
| `reviewed_by` | integer | yes | → users.id (set null) |
| `reviewed_at` | datetime | yes |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

Indexes: (status, created_at)

## subscription_plans

Membership tiers (Basic, Premium, Pro): price, duration, features. Edited in the admin panel.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `slug` | string |  |  |
| `name` | string |  |  |
| `description` | text | yes |  |
| `price_rsd` | integer |  |  |
| `duration_days` | integer |  |  |
| `features` | text | yes |  |
| `level` | integer |  |  |
| `is_active` | tinyint(1) |  |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

Indexes: unique (slug)

## producer_subscriptions

A producer's membership: requested (pending_payment), active, expired or cancelled. Paid by bank slip, confirmed by an admin.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `producer_id` | integer |  | → producers.id (cascade) |
| `subscription_plan_id` | integer |  | → subscription_plans.id (cascade) |
| `status` | string |  |  |
| `reference` | string |  |  |
| `amount_rsd` | integer |  |  |
| `starts_at` | datetime | yes |  |
| `ends_at` | datetime | yes |  |
| `confirmed_by` | integer | yes | → users.id (set null) |
| `confirmed_at` | datetime | yes |  |
| `expiry_warned_at` | datetime | yes |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

Indexes: unique (reference); (producer_id, status); (status, ends_at)

## referrals

"Preporuči proizvođača": an account opened through a producer's referral link (`producers.referral_code`). Written when the account is created; settled when the account's first producer is approved by an admin. `status` is pending, rewarded (both producers were granted 30 days of Premium), or the reason nothing was granted: cap_reached, same_person, expired, referrer_inactive.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `referrer_producer_id` | integer |  | → producers.id (cascade) |
| `referred_user_id` | integer |  | → users.id (cascade); an account is referred once |
| `referred_producer_id` | integer | yes | → producers.id (set null); a producer earns a reward once |
| `status` | string |  |  |
| `rewarded_at` | datetime | yes |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

Indexes: unique (referred_user_id); unique (referred_producer_id); (referrer_producer_id, rewarded_at)

## boosts

Paid highlighting of a producer's profile or one of their products for a number of days (polymorphic `boostable`).

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `producer_id` | integer |  | → producers.id (cascade) |
| `boostable_type` | string |  |  |
| `boostable_id` | integer |  |  |
| `status` | string |  |  |
| `reference` | string |  |  |
| `amount_rsd` | integer |  |  |
| `days` | integer |  |  |
| `starts_at` | datetime | yes |  |
| `ends_at` | datetime | yes |  |
| `confirmed_by` | integer | yes | → users.id (set null) |
| `confirmed_at` | datetime | yes |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |
| `ending_warned_at` | datetime | yes |  |

Indexes: unique (reference); (status, created_at); (producer_id, status); (boostable_type, status, ends_at); (boostable_type, boostable_id)

## campaigns

Seasonal campaigns with their own page and price.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `name` | string |  |  |
| `slug` | string |  |  |
| `description` | text | yes |  |
| `starts_on` | date |  |  |
| `ends_on` | date |  |  |
| `price_rsd` | integer |  |  |
| `is_active` | tinyint(1) |  |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

Indexes: unique (slug); (is_active, starts_on, ends_on)

## campaign_participants

A producer's paid place in a campaign.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `campaign_id` | integer |  | → campaigns.id (cascade) |
| `producer_id` | integer |  | → producers.id (cascade) |
| `status` | string |  |  |
| `reference` | string |  |  |
| `amount_rsd` | integer |  |  |
| `confirmed_by` | integer | yes | → users.id (set null) |
| `confirmed_at` | datetime | yes |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

Indexes: unique (reference); (status, created_at); unique (campaign_id, producer_id)

## weekly_picks

"Proizvođač nedelje", chosen by an admin per week.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `producer_id` | integer |  | → producers.id (cascade) |
| `product_id` | integer | yes | → products.id (set null) |
| `starts_on` | date |  |  |
| `created_by` | integer | yes | → users.id (set null) |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

Indexes: unique (starts_on); (producer_id, starts_on)

## producer_stats

Daily counters per producer: profile and product views, contact clicks, QR scans.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `producer_id` | integer |  | → producers.id (cascade) |
| `product_id` | integer |  |  |
| `event` | string |  |  |
| `date` | date |  |  |
| `hits` | integer |  |  |

Indexes: unique (producer_id, date, event, product_id)

## search_misses

"Šta kupci traže, a niko ne nudi": catalogue searches that found neither a product nor a producer, as daily counters per term. A visitor counts once a day per term; bots, terms under 3 characters and anything that looks like an e-mail address or phone number are not stored. Nothing about the visitor is kept. Rows older than 180 days are deleted nightly.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `term` | string |  | lower case, single spaces, at most 60 characters |
| `date` | date |  |  |
| `hits` | integer |  |  |

Indexes: unique (date, term)

## settings

Key-value settings edited in the admin panel (payment slip details, founding limit, boost prices).

| Column | Type | Null | Notes |
|---|---|---|---|
| `key` | string |  | primary key |
| `value` | text | yes |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

## slug_redirects

Old slugs of renamed products, producers and campaigns, answered with a 301.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `model_type` | string |  |  |
| `old_slug` | string |  |  |
| `model_id` | integer |  |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

Indexes: unique (model_type, old_slug)

## activity_logs

Audit trail of admin-relevant changes.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer |  | primary key |
| `user_id` | integer | yes | → users.id (set null) |
| `user_name` | string |  |  |
| `action` | string |  |  |
| `subject_type` | string |  |  |
| `subject_id` | integer |  |  |
| `subject_label` | string | yes |  |
| `changes` | text | yes |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

Indexes: (created_at); (subject_type, subject_id)

## notifications

Site notifications (the bell), Laravel's database channel.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | string |  | primary key |
| `type` | string |  |  |
| `notifiable_type` | string |  |  |
| `notifiable_id` | integer |  |  |
| `data` | text |  |  |
| `read_at` | datetime | yes |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

Indexes: (notifiable_type, notifiable_id)

On MySQL there are also FULLTEXT indexes on `products(name, description)` and `producers(name, description)`, used by the catalogue search.
