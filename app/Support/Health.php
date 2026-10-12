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
 */
final class Health
{
    private const HEARTBEAT = 'health:scheduler-ran-at';

    /** Cron calls every minute; a deployment keeps it waiting for less than this. */
    public const SCHEDULER_SILENT_AFTER_MINUTES = 10;

    /** Left by the scheduler, every minute. */
    public static function beat(): void
    {
        Cache::forever(self::HEARTBEAT, now()->getTimestamp());
    }

    /**
     * Each check by name, with what is wrong or null.
     *
     * A scheduler that has never run is a problem on a server and the
     * normal state of a developer's machine and of a site put up a minute
     * ago, so `/up` leaves that case out and the command does not.
     *
     * @return array<string, string|null>
     */
    public static function problems(bool $schedulerMustHaveRun = true): array
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
            'scheduler' => self::scheduler($schedulerMustHaveRun),
        ];
    }

    /** For `/up`: says nothing when all is well, throws naming what is not. */
    public static function assertUp(): void
    {
        $problems = array_filter(self::problems(schedulerMustHaveRun: false));

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
        try {
            $ranAt = Cache::get(self::HEARTBEAT);
        } catch (Throwable) {
            // Reported as the cache's problem, not as cron's.
            return null;
        }

        if ($ranAt === null) {
            return $mustHaveRun ? 'has never run: is the cron line from docs/deploy.md there?' : null;
        }

        $ranAt = Carbon::createFromTimestamp((int) $ranAt);

        return $ranAt->lt(now()->subMinutes(self::SCHEDULER_SILENT_AFTER_MINUTES))
            ? "last ran {$ranAt->diffForHumans()}: cron has stopped"
            : null;
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
