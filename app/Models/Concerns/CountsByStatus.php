<?php

namespace App\Models\Concerns;

/**
 * Row counts per status for the tabs of an admin queue, in one grouped
 * query rather than one COUNT per status.
 *
 * The using model lists its statuses in a STATUSES constant; every one of
 * them is in the result, so an empty tab reads 0 instead of going missing.
 */
trait CountsByStatus
{
    /** @return array<string, int> */
    public static function countsByStatus(): array
    {
        $counts = static::query()
            ->toBase()
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return collect(static::STATUSES)
            ->mapWithKeys(fn (string $status) => [$status => (int) ($counts[$status] ?? 0)])
            ->all();
    }
}
