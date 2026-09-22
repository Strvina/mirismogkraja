<?php

namespace App\Policies;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Review;
use App\Models\User;

class ReviewPolicy
{
    /**
     * The platform never sees the purchase itself - buyer and producer agree
     * on it directly - so the closest thing to a verified customer is someone
     * the producer has actually written back to. Requiring that reply, rather
     * than just an outgoing message, stops anyone from posting "hello" and
     * then rating a producer they have never dealt with. One review per user
     * per producer is enforced by the table's unique constraint.
     */
    public function create(User $user, Producer $producer): bool
    {
        // A producer must not be able to manufacture a "verified" purchase
        // for their own listing and then raise their public rating.
        if ($producer->user_id === $user->id) {
            return false;
        }

        if ($producer->reviews()->where('user_id', $user->id)->exists()) {
            return false;
        }

        return ProducerMessage::query()
            ->where('household_id', $producer->id)
            ->where('buyer_id', $user->id)
            ->where('sender_id', $producer->user_id)
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
