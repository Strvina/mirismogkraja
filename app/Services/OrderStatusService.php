<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Validation\ValidationException;

class OrderStatusService
{
    /**
     * Allowed forward transitions. Cancellation is only possible before the
     * order has shipped; delivered/cancelled are terminal.
     *
     * @var array<string, list<string>>
     */
    private const TRANSITIONS = [
        'pending' => ['confirmed', 'cancelled'],
        'confirmed' => ['shipped', 'cancelled'],
        'shipped' => ['delivered'],
        'delivered' => [],
        'cancelled' => [],
    ];

    public function transitionTo(Order $order, string $status): Order
    {
        if (! in_array($status, self::TRANSITIONS[$order->status] ?? [], true)) {
            throw ValidationException::withMessages([
                'status' => "Ne može se preći sa '{$order->status}' na '{$status}'.",
            ]);
        }

        $order->update(['status' => $status]);

        return $order;
    }
}
