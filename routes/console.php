<?php

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Schedule;

// Memberships and boosts are paid by bank slip, so nothing tells the
// application when one runs out - it has to look. Daily is often enough,
// and the command is safe to run more than once a day.
Schedule::command('memberships:process-expiries')->dailyAt('07:00');

// Old audit entries (see ActivityLog::KEEP_MONTHS), at a quiet hour.
Schedule::command('model:prune', ['--model' => [ActivityLog::class]])->dailyAt('03:30');
