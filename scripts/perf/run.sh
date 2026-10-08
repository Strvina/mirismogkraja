#!/usr/bin/env sh
# Run only against a new, explicitly isolated performance database.
set -eu
cd "$(dirname "$0")/../.."
if [ "${APP_ENV:-}" != testing ]; then
    echo 'Use APP_ENV=testing.' >&2
    exit 1
fi
case "${DB_DATABASE:-}" in
    vrelina_perf_*) ;;
    *) echo 'Use a dedicated vrelina_perf_* database.' >&2; exit 1 ;;
esac

php artisan migrate --force
php artisan db:seed --class=LoadTestSeeder
mkdir -p storage/perf
php scripts/perf/indexes.php down
php scripts/perf/measure.php --runs="${PERF_RUNS:-20}" --cold="${PERF_COLD:-3}" --out=storage/perf/mysql-before.json
php scripts/perf/measure.php --only="Admin/products, page 1" --queries --explain=3 > storage/perf/mysql-plans-before.txt
php scripts/perf/indexes.php up
php scripts/perf/measure.php --runs="${PERF_RUNS:-20}" --cold="${PERF_COLD:-3}" --out=storage/perf/mysql-after.json
php scripts/perf/measure.php --only="Admin/products, page 1" --queries --explain=3 > storage/perf/mysql-plans-after.txt
php scripts/perf/report.php storage/perf/mysql-before.json storage/perf/mysql-after.json > storage/perf/mysql-report.md
