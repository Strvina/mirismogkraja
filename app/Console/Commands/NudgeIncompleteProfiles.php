<?php

namespace App\Console\Commands;

use App\Models\Producer;
use App\Notifications\SiteNotification;
use App\Support\ProfileCompleteness;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Throwable;

/**
 * A week after a producer's page is opened, reminds the owner - once, on
 * the site and by e-mail - when it is still mostly empty. A page with no
 * photo and two lines of text gets no inquiries, and its owner concludes
 * the site does not work; the list of what is missing is on their own
 * page, but only for someone who comes back to look.
 *
 * Daily (routes/console.php). Each producer falls into exactly one day's
 * run, so nobody is reminded twice; the day's lock covers a second run on
 * the same day.
 */
class NudgeIncompleteProfiles extends Command
{
    protected $signature = 'producers:nudge-incomplete';

    protected $description = 'Remind owners of week-old producer pages that are still mostly empty';

    /** How long after opening the page the reminder goes out. */
    public const AFTER_DAYS = 7;

    /** A page at least this complete is left alone. */
    public const COMPLETE_ENOUGH = 70;

    public function handle(): int
    {
        if (! Cache::add('producers:nudge-incomplete:'.today()->toDateString(), true, now()->addDays(2))) {
            $this->info('Already run today.');

            return self::SUCCESS;
        }

        $sent = 0;

        Producer::query()
            // Waiting for approval or approved: both can still be improved.
            ->whereIn('status', ['pending', 'active'])
            ->whereDate('created_at', today()->subDays(self::AFTER_DAYS))
            ->withCount(['images', 'products as active_products_count' => fn ($products) => $products->where('status', 'active')])
            ->with('user')
            ->chunkById(200, function ($producers) use (&$sent) {
                foreach ($producers as $producer) {
                    $percent = ProfileCompleteness::for($producer)['percent'];

                    if ($percent >= self::COMPLETE_ENOUGH || $producer->user === null) {
                        continue;
                    }

                    try {
                        $producer->user->notify(
                            SiteNotification::producerIncomplete($producer->name, $percent, route('producers.index'))->alsoByMail()
                        );
                        $sent++;
                    } catch (Throwable $e) {
                        // One mail that fails must not cost the others theirs.
                        report($e);
                    }
                }
            });

        $this->info("Sent {$sent} reminder(s).");

        return self::SUCCESS;
    }
}
