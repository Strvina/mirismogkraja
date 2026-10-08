<?php

/*
 * The tables of docs/performance.md, from what measure.php wrote.
 *
 *     php scripts/perf/report.php before.json            one run
 *     php scripts/perf/report.php before.json after.json  the two side by side
 *
 * Prints Markdown. Reads two files and nothing else: no framework, no database.
 */

declare(strict_types=1);

namespace Perf;

if (PHP_SAPI !== 'cli' || getenv('APP_ENV') === 'production') {
    exit(1);
}

/** @return array{meta: array<string, mixed>, results: array<string, array<string, mixed>>} */
function load(string $file): array
{
    $data = json_decode((string) file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);
    $results = [];

    foreach ($data['results'] as $result) {
        $results["{$result['group']}/{$result['name']}"] = $result;
    }

    return ['meta' => $data['meta'], 'results' => $results];
}

/** A number as the tables print it: whole from 100 up, one decimal below. */
function number(float|int|null $value): string
{
    return match (true) {
        $value === null => '-',
        is_int($value) || $value >= 100 => number_format((float) $value),
        default => number_format($value, 1),
    };
}

/** "before → after", or the one value when there is nothing to compare or nothing changed. */
function pair(float|int|null $before, float|int|null $after, bool $compare): string
{
    return $compare && $after !== null && number($before) !== number($after)
        ? number($before).' → '.number($after)
        : number($before);
}

if ($argc < 2) {
    fwrite(STDERR, "Usage: php scripts/perf/report.php before.json [after.json]\n");
    exit(1);
}

$before = load($argv[1]);
$after = isset($argv[2]) ? load($argv[2]) : null;
$compare = $after !== null;

printf(
    "%s, PHP %s%s; %d timed requests per page with the cache warm, %d with it emptied.\n",
    $before['meta']['server'],
    $before['meta']['php'],
    $before['meta']['opcache'] ? '' : ' without OPcache',
    $before['meta']['runs'],
    $before['meta']['cold_runs'],
);

$group = null;

foreach ($before['results'] as $key => $row) {
    $then = $after['results'][$key] ?? null;

    if ($row['group'] !== $group) {
        $group = $row['group'];
        echo "\n**{$group}**\n\n";
        echo "| Page | Queries | DB time (ms) | Median (ms) | p95 (ms) | Cold: queries | Cold: median (ms) | Response (KB) |\n";
        echo "|---|---:|---:|---:|---:|---:|---:|---:|\n";
    }

    // A page that failed has no numbers worth a row of its own.
    $name = $row['status'] === 200 ? $row['name'] : "{$row['name']} (HTTP {$row['status']})";

    echo '| '.implode(' | ', [
        $name,
        pair($row['queries'], $then['queries'] ?? null, $compare),
        pair($row['db_ms'], $then['db_ms'] ?? null, $compare),
        pair($row['ms'], $then['ms'] ?? null, $compare),
        pair($row['ms_p95'], $then['ms_p95'] ?? null, $compare),
        pair($row['cold']['queries'] ?? null, $then['cold']['queries'] ?? null, $compare),
        pair($row['cold']['ms'] ?? null, $then['cold']['ms'] ?? null, $compare),
        number((int) round($row['bytes'] / 1024)),
    ])." |\n";
}
