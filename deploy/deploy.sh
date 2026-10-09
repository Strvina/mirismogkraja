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

if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Tracked files have local changes. Commit or preserve them before deployment." >&2
    exit 1
fi

echo "→ Verify code"
git fetch --quiet origin master
commit="${commit:-$(git rev-parse origin/master)}"
if ! git merge-base --is-ancestor "$commit" origin/master; then
    echo "$commit is not on master. Nothing was deployed." >&2
    exit 1
fi

# Check after fetching: a newly pushed commit may not exist locally yet.
# Manual runs must also refuse to move backwards or to an unrelated history.
if [[ "$commit" != "$(git rev-parse HEAD)" ]]; then
    if git merge-base --is-ancestor "$commit" HEAD; then
        echo "Nothing to do: the server is already on a newer commit than ${commit:0:7}."
        exit 0
    fi
    if ! git merge-base --is-ancestor HEAD "$commit"; then
        echo "The server and target have diverged. Review the histories before deployment." >&2
        exit 1
    fi
fi

# Git also refuses untracked/ignored paths that an incoming file would replace.
# Detect them before maintenance mode, including a file used as a parent folder.
while IFS= read -r -d '' incoming; do
    path="$incoming"
    if [[ -e "$path" || -L "$path" ]]; then
        echo "Local path conflicts with the incoming commit: $path. Nothing was deployed." >&2
        exit 1
    fi
    while [[ "$path" == */* ]]; do
        path="${path%/*}"
        if [[ -f "$path" || -L "$path" ]]; then
            echo "Local path conflicts with an incoming directory: $path. Nothing was deployed." >&2
            exit 1
        fi
    done
done < <(git diff --no-renames --name-only --diff-filter=A -z HEAD "$commit")

echo "→ Maintenance mode"
php artisan down --retry=30

echo "→ Code"
git switch --detach --no-overwrite-ignore "$commit"

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
