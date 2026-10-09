# Running the site once it is live

For whoever looks after the server. Putting the site there for the first time is
[deploy.md](deploy.md); what to change as traffic grows is [scaling.md](scaling.md). Paths below
assume the site is in `/var/www/vrelina-juga`.

## What has to be running

| What | Why | How to tell it is not |
| --- | --- | --- |
| nginx and PHP-FPM | the site | `/up` or the home page does not answer 200 |
| MySQL or MariaDB | everything | the home page answers 500; `storage/logs` names the connection |
| cron, calling `php artisan schedule:run` every minute | mail, expiries, the backup (table below) | `php artisan schedule:list` shows times that have passed; no backup from last night |
| the mail service | messages reach producers | `php artisan mail:test you@example.com` |

There is no queue worker to watch: side jobs run after the response is sent or from the scheduler.

An outside monitor (UptimeRobot is enough) should watch both `/up` and the home page. `/up` alone
keeps answering 200 in maintenance mode, where a deployment that stopped half-way leaves the site;
the home page answers 503 then.

## What runs by itself

Times are in `APP_TIMEZONE` (Belgrade unless changed). The list with each job's next run:
`php artisan schedule:list`.

| When | What | If it did not run |
| --- | --- | --- |
| every 5 minutes | e-mail about messages unread for a few minutes | `php artisan messages:email-unread` |
| hourly | "tell me when it is back" for products available again | `php artisan products:send-alerts` |
| 02:30 | the database backup | `php artisan backup:database` |
| 03:30 to 03:50 | old log entries, read notifications and search counters are deleted | nothing: the next night catches up |
| 06:00 | pauses whose return date has passed end; followers are told | the next morning catches up |
| 07:00 | memberships and boosts: a warning before the end (by e-mail too) and closing the ended ones | `php artisan memberships:process-expiries` |
| 10:00 | a reminder to the owner of a page that is still mostly empty after a week | `php artisan producers:nudge-incomplete` |
| Thursday to Saturday, 09:00 | the weekly digest to followers, once a week each | `php artisan digest:send-weekly` |

All of them are safe to run again: each marks what it has done.

## Backups

`backup:database` writes `backups/<name>-<date>.sql.gz` to the disk named by `BACKUP_DISK` and
deletes those older than `BACKUP_KEEP_DAYS` (14). With the default `local` disk that is
`storage/app/private/backups` on the same server, which covers a mistake and not a lost server:
point `BACKUP_DISK` at storage somewhere else as soon as there is one. `BACKUP_NOTIFY_EMAIL` gets a
mail when a night's backup fails.

The pictures are not in it. Copy `storage/app/public` (and `storage/app/private`, which holds the
certificates) with the server's own backup.

To restore, with the site in maintenance mode:

```bash
php artisan down
gunzip < storage/app/private/backups/FILE.sql.gz | mysql -u USER -p DATABASE
php artisan optimize
php artisan up
```

Try this once on a copy before it is needed.

## A new version

```bash
cd /var/www/vrelina-juga && ./deploy/deploy.sh
```

The script checks everything it can before it takes the site into maintenance mode (local changes,
that the commit is on `master`, that it is not older than what is running), then installs, builds,
migrates and brings the site back. If a step fails it stops there and the site stays in
maintenance: fix the cause and run it again, or `php artisan up` if nothing was changed yet.

It only moves forward. To go back to an earlier version, revert the change on `master` and deploy
that; a migration that has run is not undone by the script.

## When something is wrong

| What you see | Where to look |
| --- | --- |
| A white page or a 500 | `storage/logs/laravel-*.log`, and Sentry |
| 503 on every page | maintenance mode: a deployment stopped half-way. Read its output, then run it again or `php artisan up` |
| "Permission denied" in the log | the `chown` and `chmod` of step 3 in [deploy.md](deploy.md) |
| Something on a page is blocked (the browser's console says so) | set `CSP_REPORT_ONLY=true` in `.env` and run `php artisan optimize`; the console keeps naming what would be blocked, so it can be allowed properly |
| Mail does not arrive | `php artisan mail:test you@example.com`; the daily limit of the mail service (the weekly digest keeps to `DIGEST_MAX_PER_RUN`); failures are in `storage/logs` and Sentry |
| A membership did not end, or no warning went out | cron: see "What has to be running" |
| Pages are slow | [scaling.md](scaling.md), and [performance.md](performance.md) for what is known to cost at size |

After any change to `.env`: `php artisan optimize`, because the configuration is cached.
