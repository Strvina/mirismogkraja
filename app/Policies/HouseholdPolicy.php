<?php

namespace App\Policies;

use App\Models\Household;
use App\Models\User;

class HouseholdPolicy
{
    /**
     * Any authenticated user can see their own "my households" list.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Only the owner can view their household's management page.
     */
    public function view(User $user, Household $household): bool
    {
        return $user->id === $household->user_id;
    }

    /**
     * Any authenticated user can create a household. Creating one is how a
     * buyer becomes a seller (assigning the 'seller' role is task 1.4's job,
     * not this policy's).
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Only the owner can update their household.
     */
    public function update(User $user, Household $household): bool
    {
        return $user->id === $household->user_id;
    }

    /**
     * Only the owner can delete their household.
     */
    public function delete(User $user, Household $household): bool
    {
        return $user->id === $household->user_id;
    }
}
