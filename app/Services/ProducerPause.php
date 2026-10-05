<?php

namespace App\Services;

use App\Jobs\NotifyFollowersOfResume;
use App\Models\Producer;
use Illuminate\Support\Carbon;

/**
 * A producer's pause: sold out, away, or between seasons.
 *
 * Without it a small producer who cannot answer for a month has two bad
 * choices - leave the page as it is and let inquiries pile up unanswered,
 * which costs them their response time and the buyer's trust, or take the
 * page down and lose the search result. Paused, the page stays and says so;
 * conversations already open carry on, and only new ones wait.
 */
class ProducerPause
{
    public function pause(Producer $producer, ?Carbon $until = null, ?string $note = null): void
    {
        $producer->forceFill([
            // Kept across an edit of the date or the note: it is when the
            // pause began, not when it was last changed.
            'paused_at' => $producer->paused_at ?? now(),
            'paused_until' => $until?->toDateString(),
            'pause_note' => filled($note) ? $note : null,
        ])->save();
    }

    /**
     * Back to taking inquiries. Telling the followers - following is what
     * the paused page offers a visitor who wanted to write - is left to the
     * caller, which knows whether it is inside a request (after the
     * response) or a nightly run (straight away).
     */
    public function resume(Producer $producer): void
    {
        if ($producer->paused_at === null) {
            return;
        }

        $producer->forceFill(['paused_at' => null, 'paused_until' => null, 'pause_note' => null])->save();
    }

    /**
     * End the pauses whose return date has passed, and tell the followers.
     * Run nightly; safe to run again, since a cleared pause is not found
     * twice.
     */
    public function resumeDue(): int
    {
        $due = Producer::query()
            ->whereNotNull('paused_at')
            ->whereNotNull('paused_until')
            ->whereDate('paused_until', '<', today())
            ->get();

        foreach ($due as $producer) {
            $this->resume($producer);
            (new NotifyFollowersOfResume($producer))->handle();
        }

        return $due->count();
    }
}
