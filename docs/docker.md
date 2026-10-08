# Running the site in Docker

The whole site on one machine with one command: nginx, PHP-FPM, MySQL, Redis, a queue worker and a scheduler, with the demo content already in the database. It is meant for trying the project out and for showing it. It is **not** the production deployment; that one is described in [deploy.md](deploy.md).

## Requirements

- Docker with Compose v2 or newer: Docker Desktop on Windows and macOS, or Docker Engine with the Compose plugin on Linux. `docker compose version` shows whether it is there.
- About 2 GB of free memory and 3 GB of disk space for the demo stack (the two site images measured about 900 MB together in the Wave 1 build; MySQL, Redis and the build cache need additional space). The large performance fixture and browser tests need more memory; avoid running them together on a machine already under memory pressure.
- Port 8080 free on the machine. Another port can be chosen, see [Settings](#settings).

Nothing else has to be installed: no PHP, Node, MySQL or Redis, and no `.env` has to be made.

On Windows, verify `wsl --version` before starting Docker Desktop. If it prints only usage and Docker reports `Wsl/ExecError`, update WSL following the [Docker WSL setup instructions](https://docs.docker.com/desktop/setup/install/windows-install/#wsl-verification-and-setup), complete any requested Windows restart, then check `docker info`. The Wave 1 checks passed on this workstation after the WSL update and restart.

## Start

From the project folder:

```bash
docker compose up -d --build
```

The first run builds the images, then creates the tables and fills them with the demo content. On CI all of it takes about three minutes; a slow connection or machine makes it longer. When the command returns, the site is at **http://localhost:8080**.

The same command is used after every change to the code or to the settings: it rebuilds what changed and restarts the containers. Data is kept.

Demo accounts (they exist because the stack runs with `APP_ENV=local`):

| Role | E-mail | Password |
|---|---|---|
| Administrator | `admin@gmail.com` | `admin` |
| Buyer | `marko@example.com` | `password` |
| Producer | `nicic@example.com` | `password` |

The admin panel is at http://localhost:8080/admin. The other demo buyers and producers are listed at the top of `database/seeders/DemoContentSeeder.php`; all of them use `password`.

No e-mail is sent. Every message, including the address confirmation link of a newly registered account, is written to the log:

```bash
docker compose exec app tail -n 80 storage/logs/laravel.log
```

## What runs

| Container | What it does |
|---|---|
| `web` | nginx 1.30, the only container reachable from the machine (port 8080). Serves the built assets and the uploaded photos itself and passes everything else to `app`. Configuration: `docker/nginx/default.conf`, which follows `deploy/nginx.conf`. |
| `app` | PHP-FPM 8.2 with the application. On start it creates or updates the tables, and on the very first start also adds the demo content. |
| `queue` | `php artisan queue:work`: runs jobs put on the Redis queue. |
| `scheduler` | `php artisan schedule:work`: the scheduled commands of `routes/console.php`, the job cron has on a server. |
| `mysql` | MySQL 8.4. Database `vrelina_juga`, user `vrelina`, password `vrelina`. |
| `redis` | Redis 8: sessions, cache and queue. |

`app`, `queue` and `scheduler` are one image (`vrelina-juga/app`) started with different commands. They wait for `mysql` and `redis` to be healthy, and `queue`, `scheduler` and `web` also wait for `app` to finish preparing the database.

Three volumes keep the data: `vrelina-juga_mysql-data` (the database), `vrelina-juga_redis-data` (sessions and queued jobs) and `vrelina-juga_storage` (uploaded photos, certificates, logs, backups and the application key).

MySQL and Redis are not published on the machine, so they cannot collide with a local MySQL (XAMPP) or Redis, and nothing outside the stack can reach them. The site itself is published on `127.0.0.1` only, because the stack runs with debug mode on and with accounts whose passwords are written above.

## Everyday commands

```bash
docker compose ps                         # what is running, and whether it is healthy
docker compose logs -f                    # everything; add a name (app, queue, scheduler, web) for one
docker compose stop                       # stop, keeping the containers and the data
docker compose down                       # stop and remove the containers; the data stays

docker compose exec app php artisan about
docker compose exec app php artisan tinker
docker compose exec app php artisan schedule:list
docker compose exec app php artisan backup:database

docker compose exec mysql mysql -uvrelina -pvrelina vrelina_juga
docker compose exec redis redis-cli
```

In Git Bash on Windows, put `MSYS_NO_PATHCONV=1` in front of a command that passes a path starting with `/` to a container, or Git Bash rewrites the path.

### Tests

The PHP test suite runs in a container, on its own in-memory SQLite database, exactly as on a developer's machine:

```bash
docker compose exec app php artisan test
```

The image has GD, so the thumbnail tests that are skipped on a PHP without it run here.

The suite does not touch the stack's MySQL or Redis. This holds because the application reads its settings from a `.env` file inside the container and not from the container's environment: `phpunit.xml` takes precedence over a file, but not over real environment variables. For the same reason, do not run `php artisan config:cache` or `php artisan optimize` in the stack: with a cached configuration the tests would use MySQL and empty it.

The browser tests (Playwright) and the code style checks need Node and are run on the machine, as described in the README.

`bash docker/smoke-test.sh` checks a running stack from the outside: the pages answer, every container runs, and sessions, cache and queue really are in Redis. CI runs it on every pull request that changes the stack (`.github/workflows/docker.yml`).

## Settings

The application's settings for the stack are in `docker/app.env`. The entrypoint (`docker/php/entrypoint.sh`) copies them into each PHP container's `.env`. After changing the file, run `docker compose up -d --build` again.

- **Port.** `APP_PORT=8090 docker compose up -d --build` publishes the site on another port, and `APP_URL` follows it. In PowerShell: `$env:APP_PORT = 8090; docker compose up -d --build`. Use the same value every time, or put `APP_PORT=8090` in a `.env` file next to `docker-compose.yml`.
- **Application key.** With `APP_KEY` empty in `docker/app.env`, a key is generated on the first start and kept in the storage volume, so it survives rebuilds. To use a key of your own, fill it in.
- **Reaching the site from another device.** The port is bound to `127.0.0.1`. To open it to the local network, remove `127.0.0.1:` from the `ports` line of `web` in `docker-compose.yml`. Do this only on a network you trust: the demo passwords are public.

Compose reads a `.env` in the project folder for the `${...}` values in `docker-compose.yml`. The only one used is `APP_PORT`, so the application's own `.env`, if there is one, does not change how the stack runs, and nothing from it reaches the containers.

## Redis

In the stack, three things go through Redis, set in `docker/app.env`:

```
SESSION_DRIVER=redis
CACHE_STORE=redis
QUEUE_CONNECTION=redis
REDIS_CLIENT=predis
REDIS_HOST=redis
```

- `REDIS_CLIENT=predis` is a PHP library that is already among the dependencies, so the image needs no Redis extension.
- Sessions and queued jobs are in Redis database 0, the cache in database 1. `php artisan cache:clear` empties only the cache: nobody is logged out and no job is lost.
- `/up` answers 200 only while PHP, MySQL and Redis all respond; the `web` container's health check asks it.
- The application itself puts nothing on the queue today. Its side jobs (notifications to followers, the password reset e-mail) run after the response, so that the site needs no worker on a small server (see [scaling.md](scaling.md)). The `queue` container is there so that the stack matches a deployment with a worker, and it runs whatever is dispatched to the queue.

To look inside:

```bash
docker compose exec redis redis-cli -n 0 --scan     # sessions, queue
docker compose exec redis redis-cli -n 1 --scan     # cache
```

### Without Redis

Outside Docker nothing changes: `.env.example` keeps sessions, cache and queue in the database, and the application, the tests and CI run with no Redis at all. `.env.example` explains how to switch.

To run the stack itself without Redis, set the three values in `docker/app.env` back to `database` and run `docker compose up -d --build`. The `redis` container still starts but is not used.

## Starting again from nothing

```bash
docker compose down -v
docker compose up -d --build
```

`down -v` also deletes the three volumes: the database, the uploads, the sessions and the application key. The next start builds a fresh demo database.

The demo content is added only to a database that has no tables. A second `docker compose up` on existing data runs the new migrations and nothing else.

## Common problems

- **`Bind for 127.0.0.1:8080 failed: port is already allocated`.** Something else uses the port. Choose another one, see [Settings](#settings).
- **The command ends with `container vrelina-juga-app-1 is unhealthy`.** The `app` container could not prepare the database. `docker compose logs app` shows why.
- **`the first start was interrupted` in the log of `app`.** The first start was stopped while the demo content was being written, and the database is half filled. Start again from nothing, as above.
- **502 Bad Gateway right after a restart.** PHP is still starting; it answers a few seconds later. `docker compose ps` shows `app` as healthy when it is ready.
- **The build stops at `composer install` with `could not be downloaded (HTTP/2 429)`.** GitHub is limiting anonymous downloads from your address, which happens on shared networks and in CI. Try again a little later, or give Composer a GitHub token (any token, it needs no permissions) for the build: `COMPOSER_AUTH='{"github-oauth": {"github.com": "YOUR_TOKEN"}}' docker compose up -d --build`. The token is passed as a build secret and is not stored in the image.
- **A change to the code is not visible.** The code is copied into the image, not mounted from the folder. Run `docker compose up -d --build` again. For day-to-day development with instant reload, the setup in the README (`composer run dev`) is the better tool.
- **Logged out after `docker compose down -v`.** The sessions and the key they are signed with were in the deleted volumes.
- **The first build is slow.** It compiles PHP extensions and installs the PHP and Node dependencies. Later builds reuse those layers and take seconds, unless `composer.lock` or `package-lock.json` changed.

## What this stack is not

- **Not the production deployment.** It runs with `APP_ENV=local` and `APP_DEBUG=true`, with demo accounts whose passwords are public, with database passwords written in the repository, without HTTPS and without real e-mail. The image also contains the development dependencies, because the demo content is generated with Faker and so that the tests can run in it. Production is described in [deploy.md](deploy.md) and [scaling.md](scaling.md).
- **Not a development environment with live reload.** There is no Vite dev server and the code is not mounted into the containers.
