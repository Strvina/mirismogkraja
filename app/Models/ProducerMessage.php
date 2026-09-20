<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProducerMessage extends Model
{
    protected $fillable = [
        'household_id',
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
        return $this->belongsTo(Producer::class, 'household_id');
    }

    /** The buyer side of the thread, whoever wrote the individual message. */
    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    /** @param  Builder<ProducerMessage>  $query */
    public function scopeThread(Builder $query, Producer $producer, User $buyer): void
    {
        $query->where('household_id', $producer->id)->where('buyer_id', $buyer->id);
    }
}
