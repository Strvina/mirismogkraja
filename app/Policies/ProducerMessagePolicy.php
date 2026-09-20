<?php

namespace App\Policies;

use App\Models\Producer;
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
            return $buyer->id !== $user->id;
        }

        return $buyer->id === $user->id;
    }
}
