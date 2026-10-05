<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * That a producer has answered a "Tražim" ad. The answer itself is a
 * message in their conversation with the buyer; this row is what keeps it
 * to one answer per producer and lets the ad count them.
 */
class WantedAdResponse extends Model
{
    protected $fillable = ['producer_id'];

    public function wantedAd(): BelongsTo
    {
        return $this->belongsTo(WantedAd::class);
    }

    public function producer(): BelongsTo
    {
        return $this->belongsTo(Producer::class);
    }
}
