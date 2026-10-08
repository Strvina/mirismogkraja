#!/usr/bin/env bash
#
# Puts the latest master on the server. Run on the server, from the
# project folder, as the user that owns it:  ./deploy/deploy.sh
#
# The automatic deployment (.github/workflows/deploy.yml) runs this same
# script over SSH and names the commit whose tests passed:
#   ./deploy/deploy.sh <full commit hash>
# so that a commit pushed while those tests were still running does not go
# live untested.
#
# The site shows a maintenance page for the half minute this takes, so no
# request ever sees half-updated code or a half-migrated database. If any
# step fails, the script stops there - and the site stays in maintenance
# until it is fixed and the script run again (or `php artisan up`).

set -euo pipefail

cd "$(dirname "$0")/.."

commit="${1:-}"

# Checked before anything is touched: a mistyped argument must not take
# the site down.
if [[ -n "$commit" && ! "$commit" =~ ^[0-9a-f]{40}$ ]]; then
    echo "Usage: $0 [full commit hash on master]" >&2
    exit 64
fi

# Two runs at once - one by hand while the automatic one is still going -
# would install and migrate in the same folder. The lock is released when
# the script ends, however it ends.
exec 9> storage/framework/cache/deploy.lock
if ! flock --nonblock 9; then
    echo "Another deployment is running. Nothing was changed." >&2
    exit 1
fi

# Automatic runs can finish out of order; one that arrives late must not
# put an older version back.
if [[ -n "$commit" && "$commit" != "$(git rev-parse HEAD)" ]] &&
    git merge-base --is-ancestor "$commit" HEAD 2> /dev/null; then
    echo "Nothing to do: the server is already on a newer commit than ${commit:0:7}."
    exit 0
fi

echo "→ Maintenance mode"
php artisan down --retry=30

echo "→ Code"
git fetch --quiet origin master
if [[ -n "$commit" ]] && ! git merge-base --is-ancestor "$commit" origin/master; then
    echo "$commit is not on master. No code was changed: 'php artisan up' brings the site back." >&2
    exit 1
fi
git reset --hard "${commit:-origin/master}"

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
