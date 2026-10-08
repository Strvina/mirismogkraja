<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * What came of an inquiry, as its producer reports it.
 * Self-reported, and so only ever shown as such.
 *
 * Keyed by the thread - (producer_id, buyer_id) - so it is only ever
 * written with upsert() and read with queries, never saved as a model.
 *
 * @property int $producer_id
 * @property int $buyer_id
 * @property string $status
 * @property int|null $product_id
 * @property Carbon $updated_at
 * @property-read Product|null $product
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

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['updated_at' => 'datetime'];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
