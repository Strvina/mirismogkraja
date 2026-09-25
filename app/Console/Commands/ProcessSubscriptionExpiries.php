<?php

namespace App\Console\Commands;

use App\Services\SubscriptionService;
use Illuminate\Console\Command;

/**
 * Warns producers whose membership is about to run out, and closes the ones
 * that already have (task 20.1). Scheduled daily in routes/console.php.
 *
 * Both steps are written so a second run on the same day changes nothing,
 * which matters on a host where the scheduler is a cron line someone may
 * have set up twice.
 */
class ProcessSubscriptionExpiries extends Command
{
    protected $signature = 'memberships:process-expiries';

    protected $description = 'Obavesti proizvođače pred istek članarine i zatvori istekle';

    public function handle(SubscriptionService $subscriptions): int
    {
        ['warned' => $warned, 'expired' => $expired] = $subscriptions->processExpiries();

        $this->info("Obaveštenja pred istek: {$warned}. Istekle članarine: {$expired}.");

        return self::SUCCESS;
    }
}
