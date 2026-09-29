<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

/**
 * Money going back on something paid for and stopped early: refund_rsd is
 * what the admin decided to return, refund_account where the producer
 * wants it, refunded_at when it was sent (see CancellationService).
 */
trait HasRefund
{
    public function initializeHasRefund(): void
    {
        $this->mergeCasts(['refund_rsd' => 'integer', 'refunded_at' => 'datetime']);
    }

    /** Decided but not yet sent - an admin's open task. */
    public function scopeRefundDue(Builder $query): void
    {
        $query->where('refund_rsd', '>', 0)->whereNull('refunded_at');
    }
}
