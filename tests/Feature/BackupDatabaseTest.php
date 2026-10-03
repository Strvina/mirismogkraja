<?php

namespace Tests\Feature;

use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** The nightly backup: what it writes, what it keeps, what it never leaks. */
class BackupDatabaseTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('backups');
        config(['backup.disk' => 'backups', 'backup.keep_days' => 14]);
    }

    private function useMysql(): void
    {
        config([
            'database.default' => 'dump',
            'database.connections.dump' => [
                'driver' => 'mysql', 'host' => 'db.internal', 'port' => 3306, 'unix_socket' => '',
                'database' => 'shop', 'username' => 'app', 'password' => 's3cr"et', 'charset' => 'utf8mb4',
            ],
        ]);
    }

    private function backups(): array
    {
        return Storage::disk('backups')->files('backups');
    }

    public function test_a_mysql_dump_is_compressed_onto_the_backup_disk_without_the_password_on_the_command_line(): void
    {
        $this->useMysql();
        Process::fake(['*' => Process::result(output: "CREATE TABLE `users` (id int);\n")]);

        $this->artisan('backup:database')->assertSuccessful();

        $this->assertCount(1, $files = $this->backups());
        $this->assertStringContainsString('CREATE TABLE `users`', gzdecode(Storage::disk('backups')->get($files[0])));

        Process::assertRan(function (PendingProcess $process) {
            $command = implode(' ', $process->command);

            return str_contains($command, '--single-transaction')
                && str_starts_with($process->command[1], '--defaults-extra-file=')
                && str_ends_with($command, ' shop')
                && ! str_contains($command, 's3cr');
        });
    }

    public function test_a_failed_dump_fails_the_command_and_stores_nothing(): void
    {
        $this->useMysql();
        Process::fake(['*' => Process::result(errorOutput: 'Access denied for user', exitCode: 2)]);

        $this->artisan('backup:database')->expectsOutputToContain('Access denied')->assertFailed();

        $this->assertSame([], $this->backups());
    }

    public function test_an_sqlite_database_is_copied(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'db');
        file_put_contents($file, 'SQLite format 3');
        config(['database.default' => 'file', 'database.connections.file' => ['driver' => 'sqlite', 'database' => $file]]);

        try {
            $this->artisan('backup:database')->assertSuccessful();
        } finally {
            unlink($file);
        }

        $this->assertSame('SQLite format 3', gzdecode(Storage::disk('backups')->get($this->backups()[0])));
    }

    public function test_old_backups_are_deleted_but_never_the_newest(): void
    {
        $this->useMysql();
        Process::fake(['*' => Process::result(output: 'dump')]);
        $disk = Storage::disk('backups');

        $disk->put('backups/old.sql.gz', 'old');
        touch($disk->path('backups/old.sql.gz'), now()->subDays(20)->getTimestamp());
        $disk->put('backups/recent.sql.gz', 'recent');
        touch($disk->path('backups/recent.sql.gz'), now()->subDays(3)->getTimestamp());

        $this->artisan('backup:database')->assertSuccessful();

        $disk->assertMissing('backups/old.sql.gz');
        $disk->assertExists('backups/recent.sql.gz');
        $this->assertCount(2, $this->backups());

        // Backups stopped for a month: the last one is still there.
        $disk->deleteDirectory('backups');
        $disk->put('backups/last.sql.gz', 'last');
        touch($disk->path('backups/last.sql.gz'), now()->subDays(30)->getTimestamp());
        Process::fake(['*' => Process::result(exitCode: 1)]);

        $this->artisan('backup:database')->assertFailed();
        $disk->assertExists('backups/last.sql.gz');
    }
}
