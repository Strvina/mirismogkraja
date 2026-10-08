<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Searches of the catalogue that found nothing - "šta kupci traže, a niko
 * ne nudi". The admin reads it to know whom to invite; producers read it to
 * know what to make or list.
 *
 * Counted per term and day, never per person: a visitor counts once a day
 * for a term, bots not at all, and anything that looks like a person's
 * contact rather than a product is not stored.
 */
class SearchMisses
{
    private const MIN_LENGTH = 3;

    private const MAX_LENGTH = 60;

    /** How long the counters are kept (see routes/console.php). */
    public const KEEP_DAYS = 180;

    /** A term has to be searched by this many people before producers are shown it. */
    public const SHARED_FROM = 2;

    public function record(Request $request, string $term): void
    {
        $term = $this->normalise($term);

        if ($term === null || $this->isBot($request)) {
            return;
        }

        $visitor = $request->user()?->id ?? $request->ip();
        $today = now()->toDateString();

        // add() only writes when the key is not there yet: the same person
        // repeating a search does not make it look like demand.
        if (! Cache::add('search-miss:'.sha1("{$visitor}|{$term}|{$today}"), true, now()->endOfDay())) {
            return;
        }

        DB::table('search_misses')->upsert(
            [['term' => $term, 'date' => $today, 'hits' => 1]],
            ['date', 'term'],
            ['hits' => DB::raw('search_misses.hits + 1')],
        );
    }

    /**
     * The most searched-for missing terms over the last $days days.
     *
     * @return Collection<int, array{term: string, total: int, last_on: string}>
     */
    public function top(int $days = 30, int $limit = 50, int $atLeast = 1): Collection
    {
        // Rows of a base query are plain objects, so their columns have no
        // type the analyser could read.
        /** @var Collection<int, array{term: string, total: int, last_on: string}> */
        return DB::table('search_misses')
            ->where('date', '>=', now()->subDays($days - 1)->toDateString())
            ->selectRaw('term, sum(hits) as total, max(date) as last_on')
            ->groupBy('term')
            ->havingRaw('sum(hits) >= ?', [$atLeast])
            ->orderByDesc('total')
            ->orderBy('term')
            ->limit($limit)
            ->get()
            ->map(fn (object $row) => ['term' => $row->term, 'total' => (int) $row->total, 'last_on' => (string) $row->last_on]);
    }

    public function prune(): int
    {
        return DB::table('search_misses')->where('date', '<', now()->subDays(self::KEEP_DAYS)->toDateString())->delete();
    }

    /**
     * Lower case, single spaces, cut to length - so "Kozji  SIR" and "kozji
     * sir" are one term. Null for what should not be kept: too short to
     * mean anything, or an e-mail address or phone number typed into the
     * search box.
     */
    private function normalise(string $term): ?string
    {
        $term = Str::limit(Str::lower(Str::squish($term)), self::MAX_LENGTH, '');

        if (mb_strlen($term) < self::MIN_LENGTH || str_contains($term, '@') || preg_match('/\d{6,}/', preg_replace('/[\s\/.-]/', '', $term))) {
            return null;
        }

        return $term;
    }

    private function isBot(Request $request): bool
    {
        $agent = (string) $request->userAgent();

        return $agent === '' || preg_match(ProducerStatistics::BOTS, $agent) === 1;
    }
}
