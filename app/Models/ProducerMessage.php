<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $producer_id
 * @property int $buyer_id
 * @property int $sender_id
 * @property int|null $product_id
 * @property int|null $wanted_ad_id
 * @property string $body
 * @property Carbon|null $read_at
 * @property string|null $emailed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Producer|null $producer
 * @property-read Product|null $product
 * @property-read WantedAd|null $wantedAd
 * @property-read User|null $buyer
 * @property-read User|null $sender
 */
class ProducerMessage extends Model
{
    protected $fillable = [
        'producer_id',
        'product_id',
        'wanted_ad_id',
        'buyer_id',
        'sender_id',
        'body',
        'read_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Producer, $this> */
    public function producer(): BelongsTo
    {
        // withTrashed: an archived producer's or a deleted account's
        // conversations stay readable to the other side.
        return $this->belongsTo(Producer::class, 'producer_id')->withTrashed();
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * The "Tražim" ad a producer's first message answers, if it answers one.
     *
     * @return BelongsTo<WantedAd, $this>
     */
    public function wantedAd(): BelongsTo
    {
        return $this->belongsTo(WantedAd::class);
    }

    /**
     * The buyer side of the thread, whoever wrote the individual message.
     *
     * @return BelongsTo<User, $this>
     */
    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id')->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id')->withTrashed();
    }

    /** @param  Builder<ProducerMessage>  $query */
    public function scopeThread(Builder $query, Producer $producer, User $buyer): void
    {
        $query->where('producer_id', $producer->id)->where('buyer_id', $buyer->id);
    }
}
