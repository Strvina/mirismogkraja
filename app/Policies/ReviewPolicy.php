<?php

namespace App\Policies;

use App\Models\Producer;
use App\Models\Review;
use App\Models\User;

class ReviewPolicy
{
    /**
     * Only a buyer with at least one fulfilled inquiry containing an item from
     * this producer can review it - a "verified purchase" rule, since the
     * plan flagged this as a decision to make rather than assume. One review
     * per user per producer is enforced by the table's unique constraint.
     */
    public function create(User $user, Producer $producer): bool
    {
        if ($producer->reviews()->where('user_id', $user->id)->exists()) {
            return false;
        }

        return $user->orders()
            ->whereHas('items', fn ($query) => $query
                ->where('household_id', $producer->id)
                ->where('status', 'fulfilled'))
            ->exists();
    }

    public function update(User $user, Review $review): bool
    {
        return $user->id === $review->user_id;
    }

    public function delete(User $user, Review $review): bool
    {
        return $user->id === $review->user_id;
    }
}
