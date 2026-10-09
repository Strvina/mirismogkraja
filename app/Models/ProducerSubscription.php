<?php

namespace App\Models;

use App\Contracts\Payable;
use App\Models\Concerns\CountsByStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One producer's membership. Paid by bank slip, so it waits in
 * 'pending_payment' until an admin confirms the money arrived.
 *
 * @property int $id
 * @property int $producer_id
 * @property int $subscription_plan_id
 * @property string $status
 * @property string $reference
 * @property int $amount_rsd
 * @property Carbon|null $starts_at
 * @property Carbon|null $ends_at
 * @property int|null $confirmed_by
 * @property Carbon|null $confirmed_at
 * @property Carbon|null $expiry_warned_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Producer|null $producer
 * @property-read SubscriptionPlan|null $plan
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

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'expiry_warned_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Producer, $this> */
    public function producer(): BelongsTo
    {
        return $this->belongsTo(Producer::class, 'producer_id');
    }

    /** @return BelongsTo<SubscriptionPlan, $this> */
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

    /**
     * Paid for and not over yet: in force now, or waiting its turn behind
     * another membership of the same producer.
     *
     * @param  Builder<ProducerSubscription>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('status', self::STATUS_ACTIVE)->where('ends_at', '>', now());
    }

    /**
     * The one in force right now - what the producer's benefits come from.
     * A membership queued behind it is paid for, but has not started.
     *
     * @param  Builder<ProducerSubscription>  $query
     */
    public function scopeRunning(Builder $query): void
    {
        $query->active()->where('starts_at', '<=', now());
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE && $this->ends_at?->isFuture();
    }

    public function isRunning(): bool
    {
        return $this->isActive() && ! $this->starts_at?->isFuture();
    }
}
