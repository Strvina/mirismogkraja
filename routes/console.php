<?php

use Illuminate\Support\Facades\Schedule;

// Memberships are paid by bank slip, so nothing tells the application when
// one runs out - it has to look. Daily is often enough for a yearly
// membership, and the command is safe to run more than once a day.
Schedule::command('memberships:process-expiries')->dailyAt('07:00');
