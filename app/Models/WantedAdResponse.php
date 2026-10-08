<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * That a producer has answered a "Tražim" ad. The answer itself is a
 * message in their conversation with the buyer; this row is what keeps it
 * to one answer per producer and lets the ad count them.
 *
 * @property int $id
 * @property int $wanted_ad_id
 * @property int $producer_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read WantedAd|null $wantedAd
 * @property-read Producer|null $producer
 */
class WantedAdResponse extends Model
{
    protected $fillable = ['producer_id'];

    /** @return BelongsTo<WantedAd, $this> */
    public function wantedAd(): BelongsTo
    {
        return $this->belongsTo(WantedAd::class);
    }

    /** @return BelongsTo<Producer, $this> */
    public function producer(): BelongsTo
    {
        return $this->belongsTo(Producer::class);
    }
}
