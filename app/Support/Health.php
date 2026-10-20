<?php

namespace App\Support;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

/**
 * Whether what the site stands on is there: the database, the cache, a
 * place to write, and cron.
 *
 * Asked two ways. `/up` is for an uptime monitor and answers 500 when any
 * of them is gone (see AppServiceProvider). `php artisan health:check` is
 * for a person on the server and names each one.
 *
 * Cron is the one that fails without a sound: the pages keep opening while
 * no mail about a message goes out, no membership ends and no backup is
 * made. The scheduler leaves a mark every minute (routes/console.php), and
 * a mark that has gone old says cron has stopped.
 *
 * The backup can stop on its own while cron goes on: a run that crashed
 * holds its overlap lock for a day, a disk that refuses the file fails
 * every night, and the failure mail goes nowhere when no address is set.
 * Each backup that is made leaves a mark too, and one older than a day and
 * a bit says the nights are going by without one.
 */
final class Health
{
    private const HEARTBEAT = 'health:scheduler-ran-at';

    private const BACKUP_MADE = 'health:backup-made-at';

    /** Cron calls every minute; a deployment keeps it waiting for less than this. */
    public const SCHEDULER_SILENT_AFTER_MINUTES = 10;

    /** A backup is made nightly; this leaves room for one slow night. */
    public const BACKUP_STALE_AFTER_HOURS = 26;

    /** Left by the scheduler, every minute. */
    public static function beat(): void
    {
        Cache::forever(self::HEARTBEAT, now()->getTimestamp());
    }

    /** Left by `backup:database`, after a backup was written. */
    public static function backupMade(): void
    {
        Cache::forever(self::BACKUP_MADE, now()->getTimestamp());
    }

    /**
     * Each check by name, with what is wrong or null.
     *
     * A scheduler that has never run, or a backup never made, is a problem
     * on a server and the normal state of a developer's machine and of a
     * site put up a minute ago, so `/up` leaves that case out and the
     * command does not.
     *
     * @return array<string, string|null>
     */
    public static function problems(bool $mustHaveRun = true): array
    {
        return [
            'database' => self::attempt(fn () => DB::connection()->getPdo()),
            'cache' => self::attempt(function () {
                Cache::put('health:write', 'ok', 60);

                if (Cache::get('health:write') !== 'ok') {
                    throw new RuntimeException('what was written did not come back');
                }
            }),
            'storage' => self::attempt(function () {
                foreach ([storage_path('logs'), storage_path('framework/cache')] as $folder) {
                    if (! is_writable($folder)) {
                        throw new RuntimeException("{$folder} is not writable");
                    }
                }
            }),
            'scheduler' => self::scheduler($mustHaveRun),
            'backup' => self::backup($mustHaveRun),
        ];
    }

    /** For `/up`: says nothing when all is well, throws naming what is not. */
    public static function assertUp(): void
    {
        $problems = array_filter(self::problems(mustHaveRun: false));

        if ($problems !== []) {
            throw new RuntimeException('Not healthy: '.implode('; ', array_map(
                fn (string $name, string $problem) => "{$name}: {$problem}",
                array_keys($problems),
                $problems,
            )));
        }
    }

    private static function scheduler(bool $mustHaveRun): ?string
    {
        $ranAt = self::mark(self::HEARTBEAT);

        if ($ranAt === false) {
            return null;
        }

        if ($ranAt === null) {
            return $mustHaveRun ? 'has never run: is the cron line from docs/deploy.md there?' : null;
        }

        return $ranAt->lt(now()->subMinutes(self::SCHEDULER_SILENT_AFTER_MINUTES))
            ? "last ran {$ranAt->diffForHumans()}: cron has stopped"
            : null;
    }

    private static function backup(bool $mustHaveRun): ?string
    {
        $madeAt = self::mark(self::BACKUP_MADE);

        if ($madeAt === false) {
            return null;
        }

        if ($madeAt === null) {
            return $mustHaveRun ? 'none made yet: run php artisan backup:database' : null;
        }

        return $madeAt->lt(now()->subHours(self::BACKUP_STALE_AFTER_HOURS))
            ? "the last one was made {$madeAt->diffForHumans()}: run php artisan backup:database and read why it fails"
            : null;
    }

    /**
     * When a mark was left, null if never, false if the cache cannot be
     * read (reported as the cache's problem, not as this one's).
     */
    private static function mark(string $key): Carbon|false|null
    {
        try {
            $at = Cache::get($key);
        } catch (Throwable) {
            return false;
        }

        return $at === null ? null : Carbon::createFromTimestamp((int) $at);
    }

    private static function attempt(callable $check): ?string
    {
        try {
            $check();

            return null;
        } catch (Throwable $e) {
            return $e->getMessage();
        }
    }
}
