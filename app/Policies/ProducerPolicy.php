<?php

namespace App\Policies;

use App\Models\Producer;
use App\Models\User;

class ProducerPolicy
{
    /**
     * Any authenticated user can see their own "my producers" list.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Only the owner can view their producer's management page.
     */
    public function view(User $user, Producer $producer): bool
    {
        return $user->id === $producer->user_id;
    }

    /**
     * Any authenticated user can create a producer. Creating one is how a
     * buyer becomes a seller (assigning the 'seller' role is task 1.4's job,
     * not this policy's).
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Only the owner can update their producer.
     */
    public function update(User $user, Producer $producer): bool
    {
        return $user->id === $producer->user_id;
    }

    /**
     * Only the owner can delete their producer.
     */
    public function delete(User $user, Producer $producer): bool
    {
        return $user->id === $producer->user_id;
    }
}
