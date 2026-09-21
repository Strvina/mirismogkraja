<?php

namespace App\Policies;

use App\Models\OrderItem;
use App\Models\User;

class OrderItemPolicy
{
    /** A producer may only advance the status of their own item. */
    public function updateStatus(User $user, OrderItem $item): bool
    {
        return $item->producer->user_id === $user->id;
    }
}
