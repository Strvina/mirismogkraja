<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProducerImage extends Model
{
    protected $fillable = [
        'household_id',
        'path',
        'caption',
        'order',
    ];

    public function producer(): BelongsTo
    {
        return $this->belongsTo(Producer::class, 'household_id');
    }
}
