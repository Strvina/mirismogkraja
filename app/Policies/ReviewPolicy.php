<?php

namespace App\Policies;

use App\Models\Household;
use App\Models\Review;
use App\Models\User;

class ReviewPolicy
{
    /**
     * Only a buyer with at least one delivered order containing an item from
     * this household can review it - a "verified purchase" rule, since the
     * plan flagged this as a decision to make rather than assume. One review
     * per user per household is enforced by the table's unique constraint.
     */
    public function create(User $user, Household $household): bool
    {
        if ($household->reviews()->where('user_id', $user->id)->exists()) {
            return false;
        }

        return $user->orders()
            ->where('status', 'delivered')
            ->whereHas('items', fn ($query) => $query->where('household_id', $household->id))
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
