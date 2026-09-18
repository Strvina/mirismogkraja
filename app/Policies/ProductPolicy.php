<?php

namespace App\Policies;

use App\Models\Producer;
use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    /**
     * Any authenticated user can view their own producer's product list
     * (ownership of the producer itself is checked in the controller).
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Product $product): bool
    {
        return $user->id === $product->producer->user_id;
    }

    public function create(User $user, Producer $producer): bool
    {
        return $user->id === $producer->user_id;
    }

    public function update(User $user, Product $product): bool
    {
        return $user->id === $product->producer->user_id;
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->id === $product->producer->user_id;
    }
}
