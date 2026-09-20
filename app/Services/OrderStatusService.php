<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Validation\ValidationException;

class OrderStatusService
{
    /**
     * An inquiry's status is self-reported by the producer (task 17): the
     * platform doesn't process payment or delivery, so it can't verify any
     * of this. An inquiry waits, gets picked up, and then either comes to
     * something or doesn't.
     *
     * @var array<string, list<string>>
     */
    private const TRANSITIONS = [
        'pending' => ['contacted', 'cancelled'],
        'contacted' => ['fulfilled', 'cancelled'],
        'fulfilled' => [],
        'cancelled' => [],
    ];

    /** @var list<string> */
    public const STATUSES = ['pending', 'contacted', 'fulfilled', 'cancelled'];

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
