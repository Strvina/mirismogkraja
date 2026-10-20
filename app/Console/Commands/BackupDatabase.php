<?php

namespace App\Console\Commands;

use App\Support\Health;
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
 * A file is only kept when it is whole: every write to it went through, and
 * the dump ends with mysqldump's own "Dump completed" line. A full disk or a
 * dump cut short would otherwise leave a file that looks like a backup and
 * fails on the day it is restored. Each backup kept is marked for
 * App\Support\Health, which reports the nights that go by without one.
 *
 * Restore: gunzip < file.sql.gz | mysql -u USER -p DATABASE
 */
class BackupDatabase extends Command
{
    protected $signature = 'backup:database';

    protected $description = 'Back the database up to the backup disk and delete old backups';

    private const DIR = 'backups';

    /** mysqldump's last line, unless told to leave comments out. */
    private const COMPLETED = '-- Dump completed';

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

        Health::backupMade();
        $this->info("Backed up to {$name} (".number_format($disk->size($name) / 1024, 1).' KB).');
        $this->prune($disk);

        return self::SUCCESS;
    }

    /** @param  array<string, mixed>  $config */
    private function dumpMysql(array $config, string $target): void
    {
        $gz = $this->openGzip($target);
        $options = tempnam(sys_get_temp_dir(), 'mysqldump');
        chmod($options, 0600);
        file_put_contents($options, $this->clientOptions($config));

        $errors = '';
        $tail = '';
        $written = true;

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
                ], function (string $type, string $output) use ($gz, &$errors, &$tail, &$written) {
                    if ($type !== 'out') {
                        $errors .= $output;

                        return;
                    }

                    // Once a write has failed the rest is not written, but
                    // the dump runs on to its end so that it exits cleanly.
                    $written = $written && gzwrite($gz, $output) === strlen($output);
                    $tail = substr($tail.$output, -200);
                })
                ->wait();
        } finally {
            $written = gzclose($gz) && $written;
            @unlink($options);
        }

        if ($result->failed()) {
            throw new RuntimeException('mysqldump: '.trim($errors !== '' ? $errors : $result->errorOutput()));
        }

        if (! $written) {
            throw new RuntimeException('The dump could not be written in full to '.sys_get_temp_dir().': is the disk full?');
        }

        if (! str_contains($tail, self::COMPLETED)) {
            throw new RuntimeException('mysqldump stopped before the end of the dump (no "'.self::COMPLETED.'" line).');
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
        $gz = $this->openGzip($target);
        $written = true;

        try {
            while ($written && ! feof($in)) {
                $chunk = (string) fread($in, 1 << 20);
                $written = gzwrite($gz, $chunk) === strlen($chunk);
            }
        } finally {
            fclose($in);
            $written = gzclose($gz) && $written;
        }

        if (! $written) {
            throw new RuntimeException('The copy could not be written in full to '.sys_get_temp_dir().': is the disk full?');
        }
    }

    /** @return resource */
    private function openGzip(string $target)
    {
        return gzopen($target, 'wb6') ?: throw new RuntimeException("Could not open {$target} for writing.");
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
