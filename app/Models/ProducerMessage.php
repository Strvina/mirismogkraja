<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    public function producer(): BelongsTo
    {
        // withTrashed: an archived producer's or a deleted account's
        // conversations stay readable to the other side.
        return $this->belongsTo(Producer::class, 'producer_id')->withTrashed();
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** The "Tražim" ad a producer's first message answers, if it answers one. */
    public function wantedAd(): BelongsTo
    {
        return $this->belongsTo(WantedAd::class);
    }

    /** The buyer side of the thread, whoever wrote the individual message. */
    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id')->withTrashed();
    }

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
