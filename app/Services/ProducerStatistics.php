<?php

namespace App\Services;

use App\Models\Producer;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * What a producer's page and products are getting: views and contact clicks
 * (task 20.6).
 *
 * Kept as daily counters, not as a log of visits - one row per producer,
 * day, event and product, bumped in place. That keeps the table small and
 * the dashboard's reads cheap, and it means nothing about a visitor is ever
 * stored: no IP, no cookie, no account.
 */
class ProducerStatistics
{
    public const PROFILE_VIEW = 'profile_view';

    public const PRODUCT_VIEW = 'product_view';

    /**
     * Contact actions a visitor's browser reports. Views are counted by the
     * server; these happen after the page has loaded, so they arrive on
     * their own.
     *
     * @var array<string, string>
     */
    public const CLICKS = [
        'phone_reveal' => 'Prikaz telefona',
        'viber_click' => 'Viber',
        'whatsapp_click' => 'WhatsApp',
        'email_click' => 'E-mail',
    ];

    /**
     * Link-preview fetchers, crawlers and scripts. Their visits are not
     * interest in the producer, and counting them would make the numbers a
     * producer pays for meaningless.
     */
    /** The same visitor counts once per page in this window, however often they reload. */
    private const REPEAT_WINDOW_MINUTES = 30;

    private const BOTS = '/bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|viber|telegram|skype|curl|wget|python|headless|lighthouse/i';

    /**
     * Count one event, unless the request is not a person's visit: a bot,
     * the owner looking at their own page, or the page asking the server
     * again for data it already shows (a review page turned, the Back button
     * refreshing it) - none of those is someone new taking an interest.
     */
    public function record(Request $request, Producer $producer, string $event, ?Product $product = null): void
    {
        if ($this->shouldIgnore($request, $producer) || $this->isRepeat($request, $producer, $event, $product)) {
            return;
        }

        DB::table('producer_stats')->upsert(
            [[
                'household_id' => $producer->id,
                'product_id' => $product?->id ?? 0,
                'event' => $event,
                'date' => now()->toDateString(),
                'hits' => 1,
            ]],
            ['household_id', 'date', 'event', 'product_id'],
            ['hits' => DB::raw('producer_stats.hits + 1')],
        );
    }

    /**
     * Totals, a daily series of profile views and the most viewed products,
     * over the last $days days including today.
     *
     * @return array{
     *     days: int,
     *     totals: array<string, int>,
     *     daily: list<array{date: string, views: int}>,
     *     topProducts: list<array{id: int, name: string, slug: string, views: int}>
     * }
     */
    public function summary(Producer $producer, int $days = 30): array
    {
        $from = now()->subDays($days - 1)->startOfDay();
        $range = DB::table('producer_stats')
            ->where('household_id', $producer->id)
            ->where('date', '>=', $from->toDateString());

        $totals = (clone $range)
            ->selectRaw('event, sum(hits) as total')
            ->groupBy('event')
            ->pluck('total', 'event');

        $daily = (clone $range)
            ->where('event', self::PROFILE_VIEW)
            ->selectRaw('date, sum(hits) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $viewed = (clone $range)
            ->where('event', self::PRODUCT_VIEW)
            ->selectRaw('product_id, sum(hits) as total')
            ->groupBy('product_id')
            ->orderByDesc('total')
            ->limit(5)
            ->pluck('total', 'product_id');

        $products = $producer->products()->whereKey($viewed->keys())->get(['id', 'name', 'slug'])->keyBy('id');

        return [
            'days' => $days,
            'totals' => collect([self::PROFILE_VIEW, self::PRODUCT_VIEW, ...array_keys(self::CLICKS)])
                ->mapWithKeys(fn (string $event) => [$event => (int) ($totals[$event] ?? 0)])
                ->all(),
            // Every day of the range, the quiet ones included, so the chart
            // shows a gap as a gap rather than skipping it.
            'daily' => collect(range(0, $days - 1))
                ->map(function (int $offset) use ($from, $daily) {
                    $date = $from->copy()->addDays($offset)->toDateString();

                    return ['date' => $date, 'views' => (int) ($daily[$date] ?? 0)];
                })
                ->all(),
            // A product deleted since keeps its counts but has no page to
            // link to, so it drops out of the list.
            'topProducts' => $viewed
                ->filter(fn ($total, $id) => $products->has($id))
                ->map(fn ($total, $id) => [
                    'id' => (int) $id,
                    'name' => $products[$id]->name,
                    'slug' => $products[$id]->slug,
                    'views' => (int) $total,
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * Whether this visitor was already counted for this event lately. Keeps
     * a reload - or a script hammering the public click address - from
     * inflating the numbers a producer reads.
     */
    private function isRepeat(Request $request, Producer $producer, string $event, ?Product $product): bool
    {
        $visitor = $request->user()?->id ?? $request->ip();
        $key = 'stats-seen:'.sha1("{$visitor}|{$producer->id}|{$event}|".($product?->id ?? 0));

        // add() only writes when the key is not there yet.
        return ! Cache::add($key, true, now()->addMinutes(self::REPEAT_WINDOW_MINUTES));
    }

    private function shouldIgnore(Request $request, Producer $producer): bool
    {
        $agent = (string) $request->userAgent();

        return $agent === ''
            || preg_match(self::BOTS, $agent) === 1
            || $request->user()?->id === $producer->user_id
            || $request->header('X-Inertia-Partial-Data') !== null
            || $request->header('X-Revalidate') !== null;
    }
}
