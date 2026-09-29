<?php

namespace App\Models;

use App\Models\Concerns\CountsByStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One producer's membership. Paid by bank slip, so it waits in
 * 'pending_payment' until an admin confirms the money arrived (task 20.1).
 */
class ProducerSubscription extends Model
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
        'household_id',
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
        return $this->belongsTo(Producer::class, 'household_id');
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id');
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

    /**
     * A "poziv na broj" valid under model 97: two control digits, a dash,
     * and eight digits.
     *
     * A reference on a Serbian slip may hold only digits and dashes, and
     * under model 97 its first two digits must check out (ISO 7064 MOD
     * 97-10) - a bank rejects anything else at the counter, and a banking
     * app refuses the QR. The control digits also catch the one mistake a
     * hand-copied slip is prone to: a mistyped digit.
     */
    public static function newReference(): string
    {
        do {
            $base = (string) random_int(10_000_000, 99_999_999);
            $reference = self::controlDigits($base).'-'.$base;
        } while (static::where('reference', $reference)->exists());

        return $reference;
    }

    /** ISO 7064 MOD 97-10, as model 97 prescribes. */
    public static function controlDigits(string $digits): string
    {
        return str_pad((string) (98 - ((int) $digits * 100) % 97), 2, '0', STR_PAD_LEFT);
    }
}
