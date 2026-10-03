<?php

namespace App\Models;

use App\Contracts\Payable;
use App\Models\Concerns\CountsByStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A producer's place in a campaign. Paid by bank slip, so it waits for an
 * admin like a membership or a boost does.
 */
class CampaignParticipant extends Model implements Payable
{
    use CountsByStatus;

    public const STATUS_PENDING = 'pending_payment';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_CANCELLED = 'cancelled';

    /** @var list<string> */
    public const STATUSES = [self::STATUS_PENDING, self::STATUS_ACTIVE, self::STATUS_CANCELLED];

    protected $fillable = [
        'campaign_id',
        'household_id',
        'status',
        'reference',
        'amount_rsd',
        'confirmed_by',
        'confirmed_at',
    ];

    protected function casts(): array
    {
        return ['confirmed_at' => 'datetime'];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function producer(): BelongsTo
    {
        return $this->belongsTo(Producer::class, 'household_id');
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

    public function paymentPurpose(): ?string
    {
        return 'Kampanja '.$this->campaign->name;
    }
}
