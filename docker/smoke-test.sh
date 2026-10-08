#!/usr/bin/env bash
#
# Checks a running stack from the outside: the pages answer, the worker and
# the scheduler run, and sessions, cache and queue really are in Redis.
#
# CI runs it (.github/workflows/docker.yml). After `docker compose up -d
# --build` it can be run by hand as well:  bash docker/smoke-test.sh
#
# It logs in as a demo buyer and makes one backup; nothing else is changed.

set -euo pipefail

cd "$(dirname "$0")/.."

# Git Bash on Windows rewrites arguments that look like paths before Docker
# gets them.
export MSYS_NO_PATHCONV=1

url="http://localhost:${APP_PORT:-8080}"
cookies=$(mktemp)
trap 'rm -f "$cookies"' EXIT

step() {
    printf '\n== %s\n' "$1"
}

fail() {
    printf 'FAILED: %s\n' "$1" >&2
    exit 1
}

# Output is always taken whole and searched afterwards: a `grep -q` at the
# end of a pipe stops reading at the first match, and the command before it
# then fails for having nobody to write to.
in_container() {
    docker compose exec -T "$@" | tr -d '\r'
}

tinker() {
    in_container app php artisan tinker --execute="$1"
}

redis() {
    in_container redis redis-cli "$@"
}

# expect_status <status> <path> [curl options]
expect_status() {
    local expected=$1 path=$2 actual
    shift 2

    actual=$(curl -s -o /dev/null -w '%{http_code}' "$@" "$url$path")
    [ "$actual" = "$expected" ] || fail "GET $path answered $actual, not $expected"
    echo "GET $path -> $actual"
}

step "The site answers"

# /up is the application's own check: it also asks the database and the cache.
expect_status 200 /up

home=$(curl -fsS "$url/")
grep -q 'component&quot;:&quot;welcome&quot;' <<< "$home" || fail "the home page is not the Inertia page 'welcome'"
grep -q 'Mlekara Zapis' <<< "$home" || fail "the home page does not show the demo producers"
echo "GET / -> the home page, with the demo producers on it"

step "Built assets: compressed, and cached for a year"

asset=$(grep -o '/build/assets/app-[A-Za-z0-9_-]*\.js' <<< "$home" | head -n 1 || true)
[ -n "$asset" ] || fail "the home page names no built script"
headers=$(curl -fsS -o /dev/null -D - -H 'Accept-Encoding: gzip' "$url$asset")
grep -qi '^content-encoding: gzip' <<< "$headers" || fail "$asset is not compressed"
grep -qi '^cache-control:.*immutable' <<< "$headers" || fail "$asset is not cached as immutable"
echo "GET $asset -> gzip, immutable"

step "Uploaded images: written by PHP, served by nginx"

expect_status 200 /storage/demo/placeholder.jpg
# The small copy exists only if GD could read and write a JPEG.
expect_status 200 /storage/thumbs/demo/placeholder.jpg

step "Search (FULLTEXT on MySQL)"

expect_status 200 '/proizvodi?q=med'

step "Every container is running"

running=$(docker compose ps --status running --services | tr -d '\r')

for service in web app queue scheduler mysql redis; do
    grep -qx "$service" <<< "$running" || fail "the $service container is not running"
    echo "$service: running"
done

step "Sessions, cache and queue are set to Redis"

drivers=$(tinker 'echo config("session.driver"), "/", config("cache.default"), "/", config("queue.default");')
[[ "$drivers" == *redis/redis/redis* ]] || fail "session/cache/queue are '$drivers', not redis/redis/redis"
echo "session/cache/queue: redis/redis/redis"

step "The cache is in Redis"

tinker 'Cache::put("smoke-test:cache", "ok", 600);'
[ -n "$(redis -n 1 --scan --pattern '*smoke-test:cache')" ] || fail "a value put in the cache is not in Redis database 1"
echo "Cache::put() -> a key in Redis database 1"

step "Sessions are in Redis"

curl -fsS -c "$cookies" -o /dev/null "$url/login"
# The cookie holds the token URL-encoded; the header wants it as it was.
token=$(awk '$6 == "XSRF-TOKEN" { print $7 }' "$cookies" | sed 's/%3D/=/g')
[ -n "$token" ] || fail "the login page set no XSRF-TOKEN cookie"

login=$(curl -s -o /dev/null -w '%{http_code}' -b "$cookies" -c "$cookies" \
    -H "X-XSRF-TOKEN: $token" \
    --data-urlencode 'email=marko@example.com' \
    --data-urlencode 'password=password' \
    "$url/login")
[ "$login" = 302 ] || fail "logging in as the demo buyer answered $login, not 302"

# A page for signed-in visitors only: 200 means the session was found again.
expect_status 200 /poruke -b "$cookies"

signed_in=no

for key in $(redis -n 0 --scan --pattern '*_cache_*'); do
    session=$(redis -n 0 get "$key")

    if [[ "$session" == *login_web_* ]]; then
        signed_in=yes
        break
    fi
done

[ "$signed_in" = yes ] || fail "no session of a signed-in user in Redis database 0"
[ "$(tinker 'echo DB::table("sessions")->count();' | tr -dc '0-9')" = 0 ] || fail "sessions were written to MySQL"
echo "Login -> a session in Redis database 0, none in MySQL"

step "The queue is in Redis, and the worker takes jobs from it"

# The job removes the value again. Only the worker can have run it: this
# command does no more than put it on the queue.
tinker 'Cache::put("smoke-test:queue", "waiting", 600); Queue::push(new Illuminate\Foundation\Console\QueuedCommand(["cache:forget", ["key" => "smoke-test:queue"]]));'

for _ in $(seq 1 30); do
    [ -n "$(redis -n 1 --scan --pattern '*smoke-test:queue')" ] || break
    sleep 1
done

[ -z "$(redis -n 1 --scan --pattern '*smoke-test:queue')" ] || fail "the queued job was not run within 30 seconds"

# The worker writes "DONE" a moment after the job's effect is visible.
for _ in $(seq 1 10); do
    worker_log=$(docker compose logs --no-color queue)
    grep -q 'cache:forget.*DONE' <<< "$worker_log" && break
    sleep 1
done

grep -q 'cache:forget.*DONE' <<< "$worker_log" || fail "the queue container's log does not show the job"
echo "Queue::push() -> run by the queue container"

step "The scheduler knows its tasks, and the backup works"

schedule=$(in_container scheduler php artisan schedule:list)
grep -q 'messages:email-unread' <<< "$schedule" || fail "the scheduler does not list the scheduled commands"
echo "schedule:list -> $(grep -c . <<< "$schedule") lines"

in_container scheduler php artisan backup:database
tables=$(in_container app sh -c 'gunzip -c "$(ls -t storage/app/private/backups/*.sql.gz | head -n 1)" | grep -c "^CREATE TABLE" || true')
[ "${tables:-0}" -gt 0 ] || fail "the backup holds no tables"
echo "backup:database -> a dump with $tables tables"

printf '\nAll checks passed.\n'
