#!/bin/sh
#
# Runs in front of every PHP container of the stack: PHP-FPM, the queue
# worker and the scheduler. Each gets its .env here. The work of a first
# start - the key, the tables, the demo content - is done by the PHP-FPM
# container alone; the other two are started only once it reports healthy
# (docker-compose.yml).

set -eu

cd /var/www/html

settings=docker/app.env
state=storage/docker
key_file=$state/app.key
unfinished=$state/first-start-unfinished

fail() {
    echo "entrypoint: $*" >&2
    exit 1
}

prepare_database() {
    if [ -e "$unfinished" ]; then
        fail "the first start was interrupted and left the database half filled." \
            "Start again from nothing: docker compose down -v, then docker compose up -d --build"
    fi

    if status=$(php artisan migrate:status --no-ansi 2>&1); then
        php artisan migrate --force --no-interaction

        return
    fi

    # Only a database with no tables at all is seeded. Anything else that
    # went wrong (no connection, a wrong password) stops here instead of
    # being taken for an empty database.
    case "$status" in
        *"Migration table not found"*) ;;
        *)
            echo "$status" >&2
            fail "the database cannot be read."
            ;;
    esac

    # The seeder is not one transaction. Stopped half way, it would leave a
    # database that every later start takes for a finished one.
    touch "$unfinished"
    php artisan migrate --force --seed --no-interaction
    rm "$unfinished"
}

# A volume that some other image or root created would fail later, and
# less clearly.
[ -w storage ] || fail "storage/ is not writable. Start again from nothing: docker compose down -v"

# The image brings these folders, but a volume keeps the set it was created
# with, whatever a newer image has.
mkdir -p \
    "$state" \
    storage/app/private \
    storage/app/public \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/testing \
    storage/framework/views \
    storage/logs

configured_key=$(sed -n 's/^APP_KEY=//p' "$settings" | tail -n 1)

if [ -z "$configured_key" ] && [ ! -s "$key_file" ]; then
    [ "${1:-}" = php-fpm ] || fail "there is no application key yet; the app container makes it on its first start."

    key=$(php artisan key:generate --show --no-ansi)

    case "$key" in
        base64:*) ;;
        *) fail "no key was generated: $key" ;;
    esac

    # In the volume: the three containers share one key, and it survives a
    # rebuild - with it the sessions and everything else that is encrypted.
    (umask 077 && printf '%s\n' "$key" > "$key_file")
fi

# Laravel reads its settings from this file, not from the container's
# environment, and that is deliberate: phpunit.xml wins over a file but not
# over real environment variables. With those, `php artisan test` would run
# against this stack's MySQL and Redis - and empty both.
{
    cat "$settings"
    echo
    # The address follows the port the site is published on (docker-compose.yml).
    grep -q '^APP_URL=' "$settings" || echo "APP_URL=http://localhost:${APP_PORT:-8080}"
    [ -n "$configured_key" ] || echo "APP_KEY=$(cat "$key_file")"
} > .env

if [ "${1:-}" = php-fpm ]; then
    prepare_database

    # Compiled templates are in the volume and outlive the image they were
    # compiled from.
    php artisan view:clear
fi

exec "$@"
