<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Someone who opened an account through a producer's referral link. */
class Referral extends Model
{
    /** The account exists; its producer has not been approved yet. */
    public const STATUS_PENDING = 'pending';

    public const STATUS_REWARDED = 'rewarded';

    // Why an approved producer earned nothing - kept, so the admin and the
    // referrer can both see that the link was used and what stopped it.

    /** The referrer already had the year's allowance of rewards. */
    public const STATUS_CAP_REACHED = 'cap_reached';

    /** Both producers carry the same phone or e-mail: one person, two accounts. */
    public const STATUS_SAME_PERSON = 'same_person';

    /** Approved too long after the sign-up for the referral to count. */
    public const STATUS_EXPIRED = 'expired';

    /** The referring producer is no longer on the site. */
    public const STATUS_REFERRER_INACTIVE = 'referrer_inactive';

    /** @var array<string, string> */
    public const STATUS_LABELS = [
        self::STATUS_PENDING => 'Čeka odobrenje proizvođača',
        self::STATUS_REWARDED => 'Nagrađeno',
        self::STATUS_CAP_REACHED => 'Bez nagrade: dostignut godišnji broj',
        self::STATUS_SAME_PERSON => 'Bez nagrade: isti kontakt kao kod preporučioca',
        self::STATUS_EXPIRED => 'Bez nagrade: preporuka je istekla',
        self::STATUS_REFERRER_INACTIVE => 'Bez nagrade: preporučilac nije aktivan',
    ];

    protected $fillable = ['referrer_producer_id', 'referred_user_id', 'referred_producer_id', 'status', 'rewarded_at'];

    protected function casts(): array
    {
        return ['rewarded_at' => 'datetime'];
    }

    public function referrer(): BelongsTo
    {
        return $this->belongsTo(Producer::class, 'referrer_producer_id')->withTrashed();
    }

    public function referredUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referred_user_id')->withTrashed();
    }

    public function referredProducer(): BelongsTo
    {
        return $this->belongsTo(Producer::class, 'referred_producer_id')->withTrashed();
    }
}
