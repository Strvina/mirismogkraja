<?php

namespace App\Services;

use App\Models\Producer;
use Illuminate\Support\Facades\DB;

/**
 * The founding hundred (task 20.4): the first producers to be approved get a
 * permanent number, shown on their page and on a public list, and they keep
 * it for good - including after they start paying like everyone else.
 *
 * The number is handed out on approval rather than on sign-up, so a request
 * that is never approved does not consume a place.
 */
class FoundingProducerService
{
    public const LIMIT = 100;

    /**
     * Give this producer the next free number, if any are left and it has
     * none already. Returns the number it now holds, or null if the hundred
     * are gone.
     *
     * Reading the highest number and writing the next one has to be one
     * step, or two admins approving at the same moment could both be handed
     * the same place - the unique index would then reject one of the saves.
     */
    public function claimNumberFor(Producer $producer): ?int
    {
        if ($producer->founding_number !== null) {
            return $producer->founding_number;
        }

        return DB::transaction(function () use ($producer) {
            $taken = Producer::withTrashed()
                ->lockForUpdate()
                ->max('founding_number') ?? 0;

            if ($taken >= self::LIMIT) {
                return null;
            }

            $producer->forceFill([
                'founding_number' => $taken + 1,
                'founding_joined_at' => now(),
            ])->save();

            return $producer->founding_number;
        });
    }

    /** How many places are left, for the counter on the sign-up page. */
    public function remaining(): int
    {
        return max(0, self::LIMIT - $this->claimed());
    }

    /**
     * How many places are gone. Read as the highest number issued rather
     * than as a count of rows: the numbers are handed out in sequence and
     * never reissued, so a producer that was later archived still holds its
     * place in the hundred.
     */
    public function claimed(): int
    {
        return (int) (Producer::withTrashed()->max('founding_number') ?? 0);
    }
}
