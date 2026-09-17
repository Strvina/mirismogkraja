<?php

namespace App\Policies;

use App\Models\Household;
use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    /**
     * Any authenticated user can view their own household's product list
     * (ownership of the household itself is checked in the controller).
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Product $product): bool
    {
        return $user->id === $product->household->user_id;
    }

    public function create(User $user, Household $household): bool
    {
        return $user->id === $household->user_id;
    }

    public function update(User $user, Product $product): bool
    {
        return $user->id === $product->household->user_id;
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->id === $product->household->user_id;
    }
}
