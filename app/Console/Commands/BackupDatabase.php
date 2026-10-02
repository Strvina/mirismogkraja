<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

/**
 * Dumps the database to a gzipped SQL file on the backup disk and deletes
 * the ones past config('backup.keep_days'). Runs nightly (routes/console.php).
 *
 * MySQL/MariaDB go through mysqldump in one consistent transaction, so the
 * site stays up while it runs; the dump is compressed as it streams, so a
 * large database never sits in memory. The password goes to mysqldump in a
 * temporary options file, never on the command line where `ps` would show it.
 *
 * Restore: gunzip < file.sql.gz | mysql -u USER -p DATABASE
 */
class BackupDatabase extends Command
{
    protected $signature = 'backup:database';

    protected $description = 'Back the database up to the backup disk and delete old backups';

    private const DIR = 'backups';

    public function handle(): int
    {
        $config = config('database.connections.'.config('database.default'));
        $disk = Storage::disk(config('backup.disk'));
        $name = self::DIR.'/'.Str::slug(config('app.name')).'-'.now()->format('Y-m-d-His').'.sql.gz';
        $local = tempnam(sys_get_temp_dir(), 'backup');

        try {
            match ($config['driver']) {
                'mysql', 'mariadb' => $this->dumpMysql($config, $local),
                'sqlite' => $this->copySqlite($config['database'], $local),
                default => throw new RuntimeException("Backing up a {$config['driver']} database is not supported."),
            };

            $this->upload($disk, $name, $local);
        } catch (Throwable $e) {
            report($e);
            $this->error('Backup failed: '.$e->getMessage());

            return self::FAILURE;
        } finally {
            @unlink($local);
        }

        $this->info("Backed up to {$name} (".number_format($disk->size($name) / 1024, 1).' KB).');
        $this->prune($disk);

        return self::SUCCESS;
    }

    /** @param  array<string, mixed>  $config */
    private function dumpMysql(array $config, string $target): void
    {
        $options = tempnam(sys_get_temp_dir(), 'mysqldump');
        chmod($options, 0600);
        file_put_contents($options, $this->clientOptions($config));

        $gz = gzopen($target, 'wb6');
        $errors = '';

        try {
            $result = Process::forever()
                ->start([
                    config('backup.mysqldump'),
                    // Must come first, or mysqldump ignores it.
                    "--defaults-extra-file={$options}",
                    // A consistent snapshot of InnoDB tables without locking them.
                    '--single-transaction',
                    // Rows stream out one at a time instead of being buffered.
                    '--quick',
                    '--routines',
                    '--triggers',
                    '--hex-blob',
                    // Needs no PROCESS privilege, which shared hosts don't grant.
                    '--no-tablespaces',
                    '--default-character-set='.($config['charset'] ?? 'utf8mb4'),
                    $config['database'],
                ], function (string $type, string $output) use ($gz, &$errors) {
                    if ($type === 'out') {
                        gzwrite($gz, $output);
                    } else {
                        $errors .= $output;
                    }
                })
                ->wait();
        } finally {
            gzclose($gz);
            @unlink($options);
        }

        if ($result->failed()) {
            throw new RuntimeException('mysqldump: '.trim($errors !== '' ? $errors : $result->errorOutput()));
        }
    }

    /**
     * The connection settings in my.cnf form.
     *
     * @param  array<string, mixed>  $config
     */
    private function clientOptions(array $config): string
    {
        $quote = fn ($value) => '"'.addcslashes((string) $value, '"\\').'"';

        $lines = ['[client]', 'user='.$quote($config['username']), 'password='.$quote($config['password'] ?? '')];

        if (filled($config['unix_socket'] ?? null)) {
            $lines[] = 'socket='.$quote($config['unix_socket']);
        } else {
            $lines[] = 'host='.$quote($config['host']);
            $lines[] = 'port='.(int) $config['port'];
        }

        return implode("\n", $lines)."\n";
    }

    private function copySqlite(string $database, string $target): void
    {
        if ($database === ':memory:' || ! is_file($database)) {
            throw new RuntimeException("There is no SQLite file to back up at {$database}.");
        }

        $in = fopen($database, 'rb');
        $gz = gzopen($target, 'wb6');

        try {
            while (! feof($in)) {
                gzwrite($gz, fread($in, 1 << 20));
            }
        } finally {
            fclose($in);
            gzclose($gz);
        }
    }

    private function upload(Filesystem $disk, string $name, string $local): void
    {
        $stream = fopen($local, 'rb');

        try {
            if (! $disk->writeStream($name, $stream)) {
                throw new RuntimeException("Could not write {$name} to the backup disk.");
            }
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }
    }

    /** Deletes backups older than the keep period; the newest one always stays. */
    private function prune(Filesystem $disk): void
    {
        $cutoff = now()->subDays(max(1, config('backup.keep_days')))->getTimestamp();

        $old = collect($disk->files(self::DIR))
            ->filter(fn (string $file) => str_ends_with($file, '.sql.gz'))
            ->sortByDesc(fn (string $file) => $disk->lastModified($file))
            ->skip(1)
            ->filter(fn (string $file) => $disk->lastModified($file) < $cutoff)
            ->values();

        if ($old->isNotEmpty()) {
            $disk->delete($old->all());
            $this->line('Deleted '.$old->count().' old backup(s).');
        }
    }
}
