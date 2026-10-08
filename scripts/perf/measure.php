<?php

/*
 * Times the pages of docs/performance.md against the data of
 * Database\Seeders\LoadTestSeeder, and counts their queries.
 *
 *     php scripts/perf/measure.php --out=storage/perf/sqlite-before.json
 *     php scripts/perf/measure.php --only="Catalogue" --queries
 *     php scripts/perf/measure.php --only="Inbox/producer" --explain=5
 *
 * Options:
 *     --out=FILE      write the results as JSON (read by report.php)
 *     --only=TEXT     only the scenarios whose "group/name" contains TEXT
 *     --skip=TEXT     all but the scenarios whose "group/name" contains TEXT
 *     --runs=N        timed requests per scenario with the cache warm (20)
 *     --cold=N        timed requests per scenario with the cache emptied before each (3)
 *     --queries       print every query of one warm request instead of timing
 *     --explain=MS    with the plan of each query slower than MS milliseconds
 *
 * The database is the one the environment names (DB_CONNECTION, DB_DATABASE,
 * ... - set them on the command line; they win over .env).
 *
 * How a request is measured: a new application is booted for it, as PHP
 * does for every real request, and the request is sent through the HTTP
 * kernel - every middleware, the controller, the page's props, the root
 * Blade view. The clock runs from the moment the kernel is handed the
 * request until the response is ready. Booting the framework and opening
 * the database connection are not on the clock; they are the same for
 * every page. A signed-in request loads its account inside the measured
 * part, with the one query the session guard would run.
 *
 * Sessions are kept in memory and the cache in files of its own
 * (storage/framework/cache/perf), so every query counted is the page's own.
 *
 * Not loaded by the application, not a test, and it refuses to run where
 * APP_ENV is production.
 */

declare(strict_types=1);

namespace Perf;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\User;
use Illuminate\Cache\Events\CacheHit;
use Illuminate\Cache\Events\CacheMissed;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

if (PHP_SAPI !== 'cli') {
    exit(1);
}

$root = dirname(__DIR__, 2);

// Decided before the framework reads its environment: these win over .env.
foreach (['SESSION_DRIVER' => 'array', 'CACHE_STORE' => 'file', 'QUEUE_CONNECTION' => 'sync', 'MAIL_MAILER' => 'array', 'SENTRY_LARAVEL_DSN' => ''] as $name => $value) {
    putenv("{$name}={$value}");
    $_ENV[$name] = $_SERVER[$name] = $value;
}

require $root.'/vendor/autoload.php';

/**
 * A new application, booted as for a request.
 *
 * @return array{0: Application, 1: Kernel}
 */
function boot(string $root): array
{
    /** @var Application $app */
    $app = require $root.'/bootstrap/app.php';
    $kernel = $app->make(Kernel::class);
    $kernel->bootstrap();

    if ($app->environment('production')) {
        fwrite(STDERR, "Refusing to run: APP_ENV is production.\n");
        exit(1);
    }

    // A cache of its own, so emptying it between cold runs takes nothing of the developer's.
    $app['config']->set('cache.stores.file.path', $app->storagePath('framework/cache/perf'));
    $app['config']->set('cache.stores.file.lock_path', $app->storagePath('framework/cache/perf'));

    return [$app, $kernel];
}

/**
 * One request through a fresh application.
 *
 * @param  array{uri: string, as: string|null, headers: array<string, string>}  $scenario
 * @param  array<string, int>  $accounts  Ids by e-mail.
 * @return array{status: int, bytes: int, ms: float, queries: list<array{sql: string, raw: string, ms: float}>, after: list<array{sql: string, raw: string, ms: float}>, hits: int, misses: int, error: string|null}
 */
function request(string $root, array $scenario, array $accounts, bool $emptyCache): array
{
    [$app, $kernel] = boot($root);

    if ($emptyCache) {
        $app['cache']->store()->flush();
    }

    $db = $app['db']->connection();
    $db->getPdo();

    $queries = $after = [];
    $responded = false;
    $hits = $misses = 0;

    $db->listen(function (QueryExecuted $query) use (&$queries, &$after, &$responded) {
        $entry = ['sql' => $query->sql, 'raw' => $query->toRawSql(), 'ms' => (float) $query->time];
        $responded ? $after[] = $entry : $queries[] = $entry;
    });
    $app['events']->listen(CacheHit::class, function () use (&$hits) {
        $hits++;
    });
    $app['events']->listen(CacheMissed::class, function () use (&$misses) {
        $misses++;
    });

    $server = ['HTTP_ACCEPT' => 'text/html', 'HTTP_USER_AGENT' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) perf'];

    foreach ($scenario['headers'] as $header => $value) {
        $server['HTTP_'.strtoupper(str_replace('-', '_', $header))] = $value;
    }

    $request = Request::create($scenario['uri'], 'GET', server: $server);

    if (isset($scenario['headers']['X-Inertia'])) {
        // A partial reload is refused unless it names the assets it was loaded with.
        $request->headers->set('X-Inertia-Version', (string) $app->make(HandleInertiaRequests::class)->version($request));
    }

    $started = hrtime(true);

    if ($scenario['as'] !== null) {
        // The guard is built around a request; the kernel hands it the same one again.
        $app->instance('request', $request);
        $app['auth']->guard('web')->setUser(User::query()->findOrFail($accounts[$scenario['as']]));
    }

    $response = $kernel->handle($request);
    $bytes = strlen((string) $response->getContent());
    $ms = (hrtime(true) - $started) / 1e6;

    // What the page put off until after the response (view counters, search misses).
    $responded = true;
    $kernel->terminate($request, $response);

    $result = [
        'status' => $response->getStatusCode(),
        'bytes' => $bytes,
        'ms' => $ms,
        'queries' => $queries,
        'after' => $after,
        'hits' => $hits,
        'misses' => $misses,
        'error' => isset($response->exception) ? get_class($response->exception).': '.$response->exception->getMessage() : null,
    ];

    $app['db']->disconnect();
    $app->flush();

    return $result;
}

/** @param  non-empty-list<float>  $values */
function percentile(array $values, float $percent): float
{
    sort($values);

    return $values[(int) max(0, ceil($percent / 100 * count($values)) - 1)];
}

/**
 * Queries that differ only in their values, counted: a statement run ten
 * times in one request is a query per row.
 *
 * @param  list<array{sql: string, raw: string, ms: float}>  $queries
 * @return list<array{sql: string, count: int}>
 */
function repeated(array $queries): array
{
    $counts = array_count_values(array_column($queries, 'sql'));
    arsort($counts);

    $repeated = [];

    foreach ($counts as $sql => $count) {
        if ($count > 2) {
            $repeated[] = ['sql' => $sql, 'count' => $count];
        }
    }

    return $repeated;
}

/** @return list<string> */
function plan(Application $app, string $rawSql): array
{
    $db = $app['db']->connection();
    $sqlite = $db->getDriverName() === 'sqlite';

    return array_map(
        fn (object $row) => $sqlite ? (string) $row->detail : implode(' | ', array_map(fn ($value, string $key) => "{$key}=".($value ?? 'NULL'), (array) $row, array_keys((array) $row))),
        $db->select(($sqlite ? 'EXPLAIN QUERY PLAN ' : 'EXPLAIN ').$rawSql),
    );
}

$options = getopt('', ['out:', 'only:', 'skip:', 'runs:', 'cold:', 'queries', 'explain:']);
$runs = max(1, (int) ($options['runs'] ?? 20));
$coldRuns = max(0, (int) ($options['cold'] ?? 3));

[$app] = boot($root);
$db = $app['db']->connection();

if (! $db->table('users')->where('email', 'admin1@loadtest.test')->exists()) {
    fwrite(STDERR, "The load-test data is not in this database. Seed it first: php artisan db:seed --class=LoadTestSeeder\n");
    exit(1);
}

$scenarios = (require __DIR__.'/scenarios.php')($db);

$named = fn (array $scenario, string $text) => str_contains(mb_strtolower("{$scenario['group']}/{$scenario['name']}"), mb_strtolower($text));

if (isset($options['only'])) {
    $scenarios = array_values(array_filter($scenarios, fn (array $scenario) => $named($scenario, $options['only'])));
}

if (isset($options['skip'])) {
    $scenarios = array_values(array_filter($scenarios, fn (array $scenario) => ! $named($scenario, $options['skip'])));
}

$accounts = $db->table('users')->whereIn('email', array_filter(array_column($scenarios, 'as')))->pluck('id', 'email')->all();
$version = $db->getDriverName() === 'sqlite' ? 'SQLite '.$db->scalar('select sqlite_version()') : (string) $db->scalar('select version()');

$meta = [
    'driver' => $db->getDriverName(),
    'server' => $version,
    'database' => $db->getDatabaseName(),
    'php' => PHP_VERSION,
    'opcache' => function_exists('opcache_get_status') && (opcache_get_status(false)['opcache_enabled'] ?? false),
    'measured_at' => date('c'),
    'runs' => $runs,
    'cold_runs' => $coldRuns,
];

fwrite(STDERR, sprintf("%s, database %s, PHP %s, %d scenarios\n", $meta['server'], $meta['database'], PHP_VERSION, count($scenarios)));

if (isset($options['queries'])) {
    $slowerThan = isset($options['explain']) ? (float) $options['explain'] : null;

    foreach ($scenarios as $scenario) {
        request($root, $scenario, $accounts, false);
        $result = request($root, $scenario, $accounts, false);

        printf("\n== %s / %s\n   GET %s%s\n   %d, %d queries, %.1f ms in the database, %.1f ms, %s bytes%s\n", $scenario['group'], $scenario['name'], $scenario['uri'], $scenario['as'] ? " as {$scenario['as']}" : '', $result['status'], count($result['queries']), array_sum(array_column($result['queries'], 'ms')), $result['ms'], number_format($result['bytes']), $result['error'] ? "\n   {$result['error']}" : '');

        foreach ([...$result['queries'], ...array_map(fn (array $query) => [...$query, 'late' => true], $result['after'])] as $query) {
            printf("%9.2f ms  %s%s\n", $query['ms'], isset($query['late']) ? '(after the response) ' : '', $query['raw']);

            if ($slowerThan !== null && $query['ms'] >= $slowerThan && stripos($query['raw'], 'select') === 0) {
                foreach (plan($app, $query['raw']) as $line) {
                    echo "                  > {$line}\n";
                }
            }
        }
    }

    exit(0);
}

$results = [];

$failedRequests = 0;
foreach ($scenarios as $index => $scenario) {
    $cold = [];

    for ($run = 0; $run < $coldRuns; $run++) {
        $cold[] = request($root, $scenario, $accounts, true);
    }

    // Twice untimed: the first fills the cache, the second is the first to read from it.
    request($root, $scenario, $accounts, false);
    request($root, $scenario, $accounts, false);

    $warm = [];

    for ($run = 0; $run < $runs; $run++) {
        $warm[] = request($root, $scenario, $accounts, false);
    }

    $failures = count(array_filter([...$cold, ...$warm], fn (array $request) => $request['status'] !== 200 || $request['error'] !== null));
    $failedRequests += $failures;

    $last = end($warm);
    $databaseMs = fn (array $request) => array_sum(array_column($request['queries'], 'ms'));
    $slowest = $last['queries'];
    usort($slowest, fn (array $a, array $b) => $b['ms'] <=> $a['ms']);

    $results[] = $result = [
        ...$scenario,
        'status' => $last['status'],
        'error' => $last['error'],
        'failed_requests' => $failures,
        'bytes' => $last['bytes'],
        'queries' => count($last['queries']),
        'queries_min' => min(array_map(fn (array $request) => count($request['queries']), $warm)),
        'queries_max' => max(array_map(fn (array $request) => count($request['queries']), $warm)),
        'db_ms' => round(percentile(array_map($databaseMs, $warm), 50), 1),
        'ms' => round(percentile(array_column($warm, 'ms'), 50), 1),
        'ms_p95' => round(percentile(array_column($warm, 'ms'), 95), 1),
        'cache_hits' => $last['hits'],
        'after_queries' => count($last['after']),
        'cold' => $cold === [] ? null : [
            'queries' => count(end($cold)['queries']),
            'db_ms' => round(percentile(array_map($databaseMs, $cold), 50), 1),
            'ms' => round(percentile(array_column($cold, 'ms'), 50), 1),
            'cache_misses' => end($cold)['misses'],
        ],
        'repeated' => repeated($last['queries']),
        'slowest' => array_map(fn (array $query) => ['ms' => $query['ms'], 'sql' => $query['raw']], array_slice($slowest, 0, 3)),
    ];

    fwrite(STDERR, sprintf(
        "[%2d/%d] %-18s %-52s %3d  q=%-3d db=%8.1f  ms=%8.1f  p95=%8.1f  cold: q=%-3s ms=%s%s\n",
        $index + 1,
        count($scenarios),
        $scenario['group'],
        mb_strimwidth($scenario['name'], 0, 52),
        $result['status'],
        $result['queries'],
        $result['db_ms'],
        $result['ms'],
        $result['ms_p95'],
        $result['cold']['queries'] ?? '-',
        $result['cold']['ms'] ?? '-',
        $result['error'] ? "  !! {$result['error']}" : '',
    ));
}

$json = json_encode(['meta' => $meta, 'results' => $results], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

if (isset($options['out'])) {
    @mkdir(dirname($options['out']), recursive: true);
    file_put_contents($options['out'], $json);
    fwrite(STDERR, "Written to {$options['out']}\n");
} else {
    echo $json, "\n";
}

if ($failedRequests > 0 || $results === []) {
    fwrite(STDERR, "Performance run is invalid: {$failedRequests} failed requests, ".count($results)." scenarios.\n");
    exit(1);
}
