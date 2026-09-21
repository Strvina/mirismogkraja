<?php

namespace App\Services;

use App\Models\OrderItem;
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

    public function transitionTo(OrderItem $item, string $status): OrderItem
    {
        if (! in_array($status, self::TRANSITIONS[$item->status] ?? [], true)) {
            throw ValidationException::withMessages([
                'status' => "Ne može se preći sa '{$item->status}' na '{$status}'.",
            ]);
        }

        $item->update(['status' => $status]);

        // Retain a useful aggregate for existing admin reports and older
        // records; mixed-producer inquiries intentionally keep their last
        // aggregate state while each item remains the source of truth.
        if ($item->order->items()->distinct()->pluck('status')->count() === 1) {
            $item->order->update(['status' => $status]);
        }

        return $item;
    }
}
