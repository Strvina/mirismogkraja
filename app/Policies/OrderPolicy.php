<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    /**
     * The buyer who placed the order, a seller who fulfills at least one item
     * in it (task 4.8), or an admin (task 6.7) can view it.
     */
    public function view(User $user, Order $order): bool
    {
        if ($user->id === $order->user_id || $user->hasRole('admin')) {
            return true;
        }

        return $order->items->contains(fn ($item) => $item->household->user_id === $user->id);
    }

    /**
     * Only a fulfilling seller can change the order's status - the buyer cannot.
     */
    public function updateStatus(User $user, Order $order): bool
    {
        return $order->items->contains(fn ($item) => $item->household->user_id === $user->id);
    }
}
