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
| `password` | string |  |  |
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

Indexes: unique (email)

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
| `founding_joined_at` | datetime | yes |  |
| `verified_at` | datetime | yes |  |

Indexes: (status, name); unique (founding_number); (city); unique (slug)

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
