<?php

namespace App\Models;

use App\Contracts\Payable;
use App\Models\Concerns\CountsByStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One producer's membership. Paid by bank slip, so it waits in
 * 'pending_payment' until an admin confirms the money arrived.
 */
class ProducerSubscription extends Model implements Payable
{
    use CountsByStatus;

    public const STATUS_PENDING = 'pending_payment';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_CANCELLED = 'cancelled';

    /** @var list<string> */
    public const STATUSES = [self::STATUS_PENDING, self::STATUS_ACTIVE, self::STATUS_EXPIRED, self::STATUS_CANCELLED];

    /** How long before the end date the producer is reminded to pay again. */
    public const WARN_DAYS_BEFORE = 14;

    protected $fillable = [
        'producer_id',
        'subscription_plan_id',
        'status',
        'reference',
        'amount_rsd',
        'starts_at',
        'ends_at',
        'confirmed_by',
        'confirmed_at',
        'expiry_warned_at',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'expiry_warned_at' => 'datetime',
        ];
    }

    public function producer(): BelongsTo
    {
        return $this->belongsTo(Producer::class, 'producer_id');
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id');
    }

    public function paymentProducer(): Producer
    {
        return $this->producer;
    }

    public function paymentAmount(): int
    {
        return $this->amount_rsd;
    }

    public function paymentReference(): string
    {
        return $this->reference;
    }

    /** The purpose the admin set for memberships. */
    public function paymentPurpose(): ?string
    {
        return null;
    }

    /** @param  Builder<ProducerSubscription>  $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('status', self::STATUS_ACTIVE)->where('ends_at', '>', now());
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE && $this->ends_at?->isFuture();
    }
}
