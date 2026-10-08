<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

// These DDL checks must never be pointed at a developer's or live database.
$database = (string) DB::connection()->getDatabaseName();
if (! $app->environment('testing') || ! str_starts_with($database, 'vrelina_perf_')) {
    fwrite(STDERR, "Use APP_ENV=testing and an isolated vrelina_perf_* database.\n");
    exit(1);
}
$direction = $argv[1] ?? '';
if (! in_array($direction, ['up', 'down'], true)) {
    fwrite(STDERR, "Usage: php scripts/perf/indexes.php up|down\n");
    exit(1);
}
$files = glob(dirname(__DIR__, 2).'/database/migrations/2026_10_09_100*_*.php');
if (count($files) !== 2) {
    throw new RuntimeException('The two performance index migrations must exist.');
}
sort($files);
foreach ($direction === 'down' ? array_reverse($files) : $files as $file) {
    $migration = require $file;
    $migration->$direction();
    echo basename($file).": {$direction}\n";
}
