<?php

namespace App\Policies;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\User;

class ProducerMessagePolicy
{
    /**
     * A thread is private to its two sides: the buyer who started it and
     * whoever owns the producer it's addressed to. A producer's owner can't
     * message their own producer - there'd be nobody on the other end.
     */
    public function viewThread(User $user, Producer $producer, User $buyer): bool
    {
        if ($producer->user_id === $user->id) {
            // A seller can only reply to a conversation a buyer already
            // started. Without this, a crafted buyer ID could be used to
            // send unsolicited messages to any account.
            return $buyer->id !== $user->id
                && ProducerMessage::thread($producer, $buyer)->exists();
        }

        if ($buyer->id !== $user->id) {
            return false;
        }

        // A new conversation only with a producer the public can see - one
        // still waiting for approval, or blocked, is not open for business.
        // A conversation that already exists stays readable either way.
        return $producer->status === 'active' || ProducerMessage::thread($producer, $buyer)->exists();
    }
}
