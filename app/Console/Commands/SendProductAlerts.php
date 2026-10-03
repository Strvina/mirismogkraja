<?php

namespace App\Console\Commands;

use App\Models\ProductAlert;
use App\Notifications\SiteNotification;
use Illuminate\Console\Command;
use Throwable;

/**
 * Tells everyone waiting on a product (ProductAlert) that it is available
 * again - back in stock and in season, and public - on the site and by
 * e-mail, then forgets the request. Hourly (routes/console.php): soon
 * enough for a jar of honey, and one query when nothing has changed.
 */
class SendProductAlerts extends Command
{
    protected $signature = 'products:send-alerts';

    protected $description = 'Tell people waiting for a product that it is available again';

    public function handle(): int
    {
        $sent = 0;

        ProductAlert::query()
            ->whereHas('product', fn ($product) => $product->published()->where('stock_quantity', '>', 0)->inSeason())
            ->with(['user', 'product.producer:id,name,slug'])
            ->chunkById(200, function ($alerts) use (&$sent) {
                foreach ($alerts as $alert) {
                    try {
                        $alert->user?->notify(SiteNotification::productAvailable(
                            $alert->product->name,
                            $alert->product->producer->name,
                            route('marketplace.products.show', $alert->product->slug),
                        )->alsoByMail());
                    } catch (Throwable $e) {
                        // Kept, so the next run tries again.
                        report($e);

                        continue;
                    }

                    $alert->delete();
                    $sent++;
                }
            });

        $this->info("Sent {$sent} alert(s).");

        return self::SUCCESS;
    }
}
