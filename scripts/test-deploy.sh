#!/usr/bin/env bash
# Exercise deployment failure paths in disposable repositories. No live PHP,
# Composer, npm or database command is executed.
set -euo pipefail

project=$(cd "$(dirname "$0")/.." && pwd)
fixture=$(mktemp -d)
echo "Deployment fixtures: $fixture"
mkdir -p "$fixture/bin" "$fixture/source/deploy"
cp "$project/deploy/deploy.sh" "$fixture/source/deploy/deploy.sh"
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
export GIT_AUTHOR_NAME=Test GIT_AUTHOR_EMAIL=test@example.com
export GIT_COMMITTER_NAME=Test GIT_COMMITTER_EMAIL=test@example.com

git init --quiet --bare --initial-branch=master "$fixture/origin.git"
git init --quiet --initial-branch=master "$fixture/source"
git -C "$fixture/source" add .
git -C "$fixture/source" commit --quiet -m 'Initial deployment script'
first=$(git -C "$fixture/source" rev-parse HEAD)
git -C "$fixture/source" remote add origin "$fixture/origin.git"
git -C "$fixture/source" push --quiet origin master

for tool in php composer npm; do
    cat > "$fixture/bin/$tool" <<'STUB'
#!/usr/bin/env bash
echo "$(basename "$0") $*" >> "$DEPLOY_TEST_LOG"
[[ "$(basename "$0")" != "${DEPLOY_TEST_FAIL:-}" ]]
STUB
    chmod +x "$fixture/bin/$tool"
done
export PATH="$fixture/bin:$PATH"

new_checkout() {
    checkout="$fixture/$1"
    git clone --quiet "$fixture/origin.git" "$checkout"
    mkdir -p "$checkout/storage/framework/cache"
    export DEPLOY_TEST_LOG="$fixture/$1.log"
    : > "$DEPLOY_TEST_LOG"
    unset DEPLOY_TEST_FAIL
}

must_fail_without_commands() {
    if bash "$checkout/deploy/deploy.sh" "$@" > "$fixture/result" 2>&1; then
        cat "$fixture/result"
        echo 'Expected refusal' >&2
        exit 1
    fi
    [[ ! -s "$DEPLOY_TEST_LOG" ]] || { cat "$DEPLOY_TEST_LOG"; exit 1; }
}

new_checkout invalid-hash
must_fail_without_commands 'not-a-sha'
new_checkout missing-commit
must_fail_without_commands 0000000000000000000000000000000000000000
new_checkout dirty-file
echo '# local work' >> "$checkout/deploy/deploy.sh"
must_fail_without_commands "$first"
grep -q 'local work' "$checkout/deploy/deploy.sh"
new_checkout staged-file
echo '# staged work' >> "$checkout/deploy/deploy.sh"
git -C "$checkout" add deploy/deploy.sh
must_fail_without_commands "$first"
git -C "$checkout" diff --cached --quiet && exit 1
new_checkout fetch-failure
git -C "$checkout" remote set-url origin "$fixture/nonexistent.git"
must_fail_without_commands "$first"
new_checkout locked
(
    exec 8> "$checkout/storage/framework/cache/deploy.lock"
    flock --nonblock 8
    must_fail_without_commands "$first"
)

new_checkout fast-forward
echo 'second version' > "$fixture/source/version.txt"
git -C "$fixture/source" add version.txt
git -C "$fixture/source" commit --quiet -m 'Second version'
second=$(git -C "$fixture/source" rev-parse HEAD)
git -C "$fixture/source" push --quiet origin master
bash "$checkout/deploy/deploy.sh" "$second" > "$fixture/result" 2>&1
[[ "$(git -C "$checkout" rev-parse HEAD)" == "$second" ]]
grep -qx 'php artisan migrate --force' "$DEPLOY_TEST_LOG"
grep -qx 'php artisan up' "$DEPLOY_TEST_LOG"

# A delayed run of the older commit must neither roll back nor go offline.
: > "$DEPLOY_TEST_LOG"
bash "$checkout/deploy/deploy.sh" "$first" > "$fixture/result" 2>&1
[[ ! -s "$DEPLOY_TEST_LOG" ]]
[[ "$(git -C "$checkout" rev-parse HEAD)" == "$second" ]]

new_checkout divergent
echo 'local commit' > "$checkout/local.txt"
git -C "$checkout" add local.txt
git -C "$checkout" commit --quiet -m 'Local divergent history'
echo 'third version' > "$fixture/source/version.txt"
git -C "$fixture/source" commit --quiet -am 'Third version'
third=$(git -C "$fixture/source" rev-parse HEAD)
git -C "$fixture/source" push --quiet origin master
must_fail_without_commands "$third"

new_checkout untracked-collision
echo 'local file must survive' > "$checkout/incoming.txt"
echo 'upstream file' > "$fixture/source/incoming.txt"
git -C "$fixture/source" add incoming.txt
git -C "$fixture/source" commit --quiet -m 'Incoming file'
fourth=$(git -C "$fixture/source" rev-parse HEAD)
git -C "$fixture/source" push --quiet origin master
must_fail_without_commands "$fourth"
grep -qx 'local file must survive' "$checkout/incoming.txt"

new_checkout ignored-collision
echo 'ignored.txt' >> "$checkout/.git/info/exclude"
echo 'ignored local file' > "$checkout/ignored.txt"
echo 'upstream ignored-name file' > "$fixture/source/ignored.txt"
git -C "$fixture/source" add ignored.txt
git -C "$fixture/source" commit --quiet -m 'Incoming ignored-name file'
fifth=$(git -C "$fixture/source" rev-parse HEAD)
git -C "$fixture/source" push --quiet origin master
must_fail_without_commands "$fifth"
grep -qx 'ignored local file' "$checkout/ignored.txt"

new_checkout dependency-failure
export DEPLOY_TEST_FAIL=composer
if bash "$checkout/deploy/deploy.sh" "$fifth" > "$fixture/result" 2>&1; then
    echo 'Expected Composer failure' >&2
    exit 1
fi
grep -qx 'php artisan down --retry=30' "$DEPLOY_TEST_LOG"
if grep -qx 'php artisan up' "$DEPLOY_TEST_LOG"; then
    echo 'A failed deployment reopened the application' >&2
    exit 1
fi

echo 'Deployment safeguards passed: invalid/missing target, dirty/staged files, failed fetch, lock, fast-forward, stale run, divergent history, untracked/ignored collisions and failed dependency.'
