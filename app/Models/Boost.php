<?php

namespace App\Models;

use App\Contracts\Payable;
use App\Models\Concerns\CountsByStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * A paid boost (task 20.2): a producer's profile, or one of their products,
 * in the labelled "Istaknuto" row for a number of days. Paid by bank slip,
 * so it waits for an admin like a membership does.
 */
class Boost extends Model implements Payable
{
    use CountsByStatus;

    public const STATUS_PENDING = 'pending_payment';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_CANCELLED = 'cancelled';

    /** @var list<string> */
    public const STATUSES = [self::STATUS_PENDING, self::STATUS_ACTIVE, self::STATUS_EXPIRED, self::STATUS_CANCELLED];

    /** What can be boosted, by morph alias. */
    public const PROFILE = 'household';

    public const PRODUCT = 'product';

    protected $fillable = [
        'household_id',
        'boostable_type',
        'boostable_id',
        'status',
        'reference',
        'amount_rsd',
        'days',
        'starts_at',
        'ends_at',
        'ending_warned_at',
        'confirmed_by',
        'confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'ending_warned_at' => 'datetime',
            'confirmed_at' => 'datetime',
        ];
    }

    public function producer(): BelongsTo
    {
        return $this->belongsTo(Producer::class, 'household_id');
    }

    public function boostable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Running right now. The end date decides, not the status: a boost is
     * over the moment it ends, whether or not the daily command has marked
     * it expired yet.
     *
     * @param  Builder<Boost>  $query
     */
    public function scopeRunning(Builder $query): void
    {
        $query->where('status', self::STATUS_ACTIVE)->where('ends_at', '>', now());
    }

    public function isProduct(): bool
    {
        return $this->boostable_type === self::PRODUCT;
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

    /** Says which of the two was bought, so two slips from one producer differ. */
    public function paymentPurpose(): ?string
    {
        return ($this->isProduct() ? 'Isticanje proizvoda' : 'Isticanje profila').' na sajtu '.config('app.name');
    }
}
