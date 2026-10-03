<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One week's "Proizvođač nedelje". A week is identified by its
 * Monday, and has at most one pick.
 */
class WeeklyPick extends Model
{
    /** A producer picked within this many weeks is flagged, not offered. */
    public const REPEAT_AFTER_WEEKS = 8;

    protected $fillable = [
        'producer_id',
        'product_id',
        'starts_on',
        'created_by',
    ];

    protected function casts(): array
    {
        // Sent to the page as a bare date: it names a week, not a moment.
        return ['starts_on' => 'date:Y-m-d'];
    }

    public function producer(): BelongsTo
    {
        return $this->belongsTo(Producer::class, 'producer_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** The Monday of the week $date falls in. */
    public static function weekOf(?Carbon $date = null): Carbon
    {
        return ($date ?? now())->copy()->startOfWeek(Carbon::MONDAY)->startOfDay();
    }

    /** @param  Builder<WeeklyPick>  $query */
    public function scopeCurrent(Builder $query): void
    {
        $query->whereDate('starts_on', self::weekOf());
    }
}
