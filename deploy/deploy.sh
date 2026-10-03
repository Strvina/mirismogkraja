#!/usr/bin/env bash
#
# Puts the latest master on the server. Run on the server, from the
# project folder, as the user that owns it:  ./deploy/deploy.sh
#
# The site shows a maintenance page for the half minute this takes, so no
# request ever sees half-updated code or a half-migrated database. If any
# step fails, the script stops there - and the site stays in maintenance
# until it is fixed and the script run again (or `php artisan up`).

set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ Maintenance mode"
php artisan down --retry=30

echo "→ Code"
git fetch --quiet origin master
git reset --hard origin/master

echo "→ PHP dependencies"
composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

echo "→ Assets"
npm ci --no-audit --no-fund
npm run build

echo "→ Database"
php artisan migrate --force

echo "→ Caches"
php artisan optimize
php artisan view:cache

echo "→ Back online"
php artisan up

echo "Done: $(git log -1 --format='%h %s')"
