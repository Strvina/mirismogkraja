<?php

/*
 * How much of app/Services and app/Support the tests run, from the Clover
 * file PHPUnit wrote.
 *
 *     php scripts/coverage.php clover.xml            the table
 *     php scripts/coverage.php clover.xml --min=85   and fail below 85 %
 *
 * Prints Markdown. Those two folders hold the rules of the site (who pays
 * what, who is told what, what a search finds); controllers and pages are
 * exercised by the feature and browser tests and are not counted here.
 *
 * Reads one file and nothing else: no framework, no database.
 */

declare(strict_types=1);

namespace Coverage;

const FOLDERS = ['app/Services/', 'app/Support/'];

if (PHP_SAPI !== 'cli' || ! isset($argv[1]) || ! is_file($argv[1])) {
    fwrite(STDERR, "Usage: php scripts/coverage.php clover.xml [--min=85]\n");
    exit(64);
}

$minimum = null;

foreach (array_slice($argv, 2) as $option) {
    if (str_starts_with($option, '--min=')) {
        $minimum = (float) substr($option, 6);
    }
}

/**
 * Line numbers as the ranges a person would read: 12-15, 31.
 *
 * @param  list<int>  $lines
 */
function ranges(array $lines): string
{
    $ranges = [];

    foreach ($lines as $line) {
        $last = array_key_last($ranges);

        if ($last !== null && $ranges[$last][1] === $line - 1) {
            $ranges[$last][1] = $line;
        } else {
            $ranges[] = [$line, $line];
        }
    }

    return implode(', ', array_map(fn (array $range) => $range[0] === $range[1] ? (string) $range[0] : "{$range[0]}-{$range[1]}", $ranges));
}

$files = [];

foreach (simplexml_load_file($argv[1])->xpath('//file') as $file) {
    $path = str_replace('\\', '/', (string) $file['name']);
    $folder = current(array_filter(FOLDERS, fn (string $folder) => str_contains($path, "/{$folder}")));

    if ($folder === false) {
        continue;
    }

    $statements = [];

    foreach ($file->line as $line) {
        if ((string) $line['type'] === 'stmt') {
            $statements[(int) $line['num']] = (int) $line['count'] > 0;
        }
    }

    if ($statements !== []) {
        $files[substr($path, strpos($path, "/{$folder}") + 1)] = $statements;
    }
}

if ($files === []) {
    fwrite(STDERR, "No file of app/Services or app/Support in {$argv[1]}.\n");
    exit(1);
}

ksort($files);

$all = 0;
$run = 0;

echo "| File | Statements | Run | Lines never run |\n|---|---:|---:|---|\n";

foreach ($files as $name => $statements) {
    $covered = count(array_filter($statements));
    $missed = array_keys(array_filter($statements, fn (bool $ran) => ! $ran));
    $all += count($statements);
    $run += $covered;

    printf("| `%s` | %d | %.1f %% | %s |\n", $name, count($statements), 100 * $covered / count($statements), ranges($missed));
}

$percent = 100 * $run / $all;

printf("\n**%.1f %%** of %d statements in %d files.\n", $percent, $all, count($files));

if ($minimum !== null && $percent < $minimum) {
    fwrite(STDERR, sprintf("Coverage of the services is %.1f %%, below the %.1f %% this project keeps.\n", $percent, $minimum));
    exit(1);
}
