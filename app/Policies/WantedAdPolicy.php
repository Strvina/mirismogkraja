<?php

namespace App\Policies;

use App\Models\Producer;
use App\Models\User;
use App\Models\WantedAd;

class WantedAdPolicy
{
    /** Closing or deleting an ad is its author's call. */
    public function update(User $user, WantedAd $ad): bool
    {
        return $ad->user_id === $user->id;
    }

    /**
     * Answering as a producer: one of the user's own, approved and still
     * there, to an ad the public can see and that is not their own - nobody
     * sells to themselves - and not where either side has already closed
     * the conversation between the two.
     */
    public function respond(User $user, WantedAd $ad, Producer $producer): bool
    {
        return $producer->user_id === $user->id
            && $producer->status === 'active'
            && ! $producer->trashed()
            && $ad->user_id !== $user->id
            && $ad->isListed()
            && ! $producer->hasBlocked($ad->user);
    }
}
