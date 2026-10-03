<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * What came of an inquiry, as its producer reports it (task 14, point 5).
 * Self-reported, and so only ever shown as such.
 *
 * Keyed by the thread - (producer_id, buyer_id) - so it is only ever
 * written with upsert() and read with queries, never saved as a model.
 */
class InquiryOutcome extends Model
{
    /** @var array<string, string> */
    public const STATUSES = [
        'contacted' => 'Kontaktiran kupac',
        'completed' => 'Realizovano',
        'cancelled' => 'Otkazano',
    ];

    public $timestamps = false;

    protected function casts(): array
    {
        return ['updated_at' => 'datetime'];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
