<?php

use App\Models\ActivityLog;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Schedule;

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

// The database, nightly, before the other jobs touch it (see config/backup.php).
$backup = Schedule::command('backup:database')->dailyAt('02:30')->withoutOverlapping();

if ($notify = config('backup.notify')) {
    $backup->emailOutputOnFailure($notify);
}
