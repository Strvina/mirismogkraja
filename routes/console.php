<?php

use App\Models\ActivityLog;
use App\Services\ProducerPause;
use App\Services\SearchMisses;
use App\Support\Health;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Schedule;

// A mark that cron is calling, read by /up and `php artisan health:check`
// (App\Support\Health). Also during a deployment, so the site is not
// reported down for the minute after it comes back.
Schedule::call(fn () => Health::beat())
    ->everyMinute()
    ->evenInMaintenanceMode()
    ->name('scheduler-heartbeat');

// Memberships and boosts are paid by bank slip, so nothing tells the
// application when one runs out - it has to look. Daily is often enough,
// and the command is safe to run more than once a day.
Schedule::command('memberships:process-expiries')->dailyAt('07:00');

// Old audit entries (see ActivityLog::KEEP_MONTHS), at a quiet hour.
Schedule::command('model:prune', ['--model' => [ActivityLog::class]])->dailyAt('03:30');

// Notifications already read, after half a year: nobody scrolls back that
// far, and the table is read on every page for the unread count.
Schedule::call(fn () => DatabaseNotification::query()
    ->whereNotNull('read_at')
    ->where('created_at', '<', now()->subMonths(6))
    ->delete())
    ->dailyAt('03:45')
    ->name('prune-read-notifications');

// Counters of searches that found nothing, past the time anyone reads them.
Schedule::call(fn () => app(SearchMisses::class)->prune())
    ->dailyAt('03:50')
    ->name('prune-search-misses');

// The database, nightly, before the other jobs touch it (see config/backup.php).
$backup = Schedule::command('backup:database')->dailyAt('02:30')->withoutOverlapping();

if ($notify = config('backup.notify')) {
    $backup->emailOutputOnFailure($notify);
}

// Producers whose pause had a return date that has passed: back to taking
// inquiries, and their followers are told. Early, before anyone writes.
Schedule::call(fn () => app(ProducerPause::class)->resumeDue())
    ->dailyAt('06:00')
    ->name('resume-paused-producers');

// A reminder to owners whose week-old page is still mostly empty.
Schedule::command('producers:nudge-incomplete')->dailyAt('10:00')->withoutOverlapping();

// "You have a message" e-mails, for messages unread for a few minutes.
Schedule::command('messages:email-unread')->everyFiveMinutes()->withoutOverlapping();

// What followed producers added this week. From Thursday morning, in time
// to plan the weekend's market; Friday and Saturday pick up whoever was left
// over the per-run limit (nobody gets it twice in a week).
Schedule::command('digest:send-weekly')->days([4, 5, 6])->at('09:00')->withoutOverlapping();

// "Javi mi kad stigne": products back in stock or in season.
Schedule::command('products:send-alerts')->hourly()->withoutOverlapping();
