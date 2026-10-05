<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * The months of the year as pages (/sezona/oktobar), and which of them have
 * anything in season.
 *
 * "In season" here means a product whose producer set a season and whose
 * season covers the month. A product without one is sold all year, and a
 * page that listed those too would just be the catalogue again.
 */
class SeasonCalendar
{
    /** The address of each month. Serbian in every language, like every other address. */
    public const SLUGS = [
        1 => 'januar', 2 => 'februar', 3 => 'mart', 4 => 'april', 5 => 'maj', 6 => 'jun',
        7 => 'jul', 8 => 'avgust', 9 => 'septembar', 10 => 'oktobar', 11 => 'novembar', 12 => 'decembar',
    ];

    private const CACHE_KEY = 'season:months';

    private const CACHE_SECONDS = 600;

    public function slug(int $month): string
    {
        return self::SLUGS[$month];
    }

    public function month(string $slug): ?int
    {
        return array_search($slug, self::SLUGS, true) ?: null;
    }

    /** The month's name in the reader's language: "oktobar", "October", "октябрь". */
    public function name(int $month): string
    {
        return Carbon::create(2000, $month, 1)->locale(app()->getLocale())->monthName;
    }

    /**
     * The months something published is in season. Read from the distinct
     * seasons in the catalogue - a handful of pairs - rather than by asking
     * twelve times.
     *
     * @return list<int>
     */
    public function monthsWithProducts(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_SECONDS, function () {
            $months = [];

            $seasons = Product::query()
                ->published()
                ->whereNotNull('season_from')
                ->whereNotNull('season_to')
                ->distinct()
                ->toBase()
                ->get(['season_from', 'season_to']);

            foreach ($seasons as $season) {
                foreach ($this->monthsOf((int) $season->season_from, (int) $season->season_to) as $month) {
                    $months[$month] = true;
                }
            }

            ksort($months);

            return array_keys($months);
        });
    }

    /**
     * Every month of a season, which may wrap the new year (11 → 2).
     *
     * @return list<int>
     */
    private function monthsOf(int $from, int $to): array
    {
        return $from <= $to ? range($from, $to) : [...range($from, 12), ...range(1, $to)];
    }
}
