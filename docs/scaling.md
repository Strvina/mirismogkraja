# Deploying and scaling

What the app needs to run well in production, and what to change as traffic grows.
Everything below is configuration: the code already supports each step.

## Every deployment

- `APP_ENV=production`, `APP_DEBUG=false`. With debug on, an error page shows code and settings to anyone.
- `php artisan migrate --force`, then `php artisan optimize`. This caches config, routes, events and views.
- `npm ci && npm run build`.
- `php artisan storage:link` when `MEDIA_DISK=public`.
- **Cron:** `* * * * * php /path/to/artisan schedule:run`. Without it, memberships and boosts never expire, nobody gets the "ending soon" warnings, and old logs and notifications are never pruned.
- **PHP GD extension:** with GD, uploads get a 480px copy for cards and lists. Without it, pages show the originals. After enabling GD, run `php artisan media:thumbnails` once to make copies of images uploaded before that.
- **Turnstile keys** (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, free at dash.cloudflare.com → Turnstile, add the site's domain): without them registration and password reset have no robot check.

## When traffic grows

| Sign | Change |
|---|---|
| Many visitors at the same time, slow pages | Redis for `CACHE_STORE`, `SESSION_DRIVER` and `QUEUE_CONNECTION`. `REDIS_CLIENT=predis` needs no PHP extension. |
| More than one web server | `MEDIA_DISK=s3` (`composer require league/flysystem-aws-s3-v3`, set `AWS_*`), copy existing files to the bucket, and use Redis for sessions and cache so every server shares them. |
| A queue worker is available | Follower notifications (`NotifyFollowersOfProduct`) can go to the queue instead of running after the response: change `->afterResponse()` to a plain `dispatch`. |
| Images are a large share of traffic | Put a CDN in front of the bucket. `Media::baseUrl()` follows the disk's URL. |

## What already scales by design

- Every list is paginated on the server. Filters and sorting run in the database on indexed columns.
- The unread badges are indexed counts. One poll every 30 s refreshes both, and an open conversation slows from 3 s to 20 s when it goes quiet.
- The home page popularity ranking is cached for 10 minutes. Only the ids are cached, and the cards are read fresh.
- The sitemap is an index of files with 10,000 addresses each, cached for an hour.
- Notifications to followers are sent in chunks after the response. Read notifications are pruned after six months.
- Translations load as a lazy chunk, only for English and Russian visitors. Leaflet, the QR library and the map tiles load only when used.
