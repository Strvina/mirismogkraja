<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    /**
     * The buyer who placed the order, or a seller who fulfills at least one
     * item in it, can view it (task 4.8: "Moje porudžbine" / "Porudžbine mog
     * domaćinstva").
     */
    public function view(User $user, Order $order): bool
    {
        if ($user->id === $order->user_id) {
            return true;
        }

        return $order->items->contains(fn ($item) => $item->household->user_id === $user->id);
    }
}
