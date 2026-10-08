<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A place where a producer sells in person - a market stall, a fair, a shop - and when.
 *
 * @property int $id
 * @property int $producer_id
 * @property string $name
 * @property string|null $city
 * @property list<int> $days
 * @property string|null $opens_at
 * @property string|null $closes_at
 * @property string|null $note
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Producer|null $producer
 */
class ProducerMarket extends Model
{
    /** A page lists them all, so a producer gets a handful, not a timetable. */
    public const MAX_PER_PRODUCER = 8;

    /** What the public pages print. */
    public const PUBLIC_COLUMNS = ['id', 'producer_id', 'name', 'city', 'days', 'opens_at', 'closes_at', 'note'];

    protected $fillable = ['name', 'city', 'days', 'opens_at', 'closes_at', 'note'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['days' => 'array'];
    }

    /** @return BelongsTo<Producer, $this> */
    public function producer(): BelongsTo
    {
        return $this->belongsTo(Producer::class);
    }

    /**
     * "07:00", whether the database keeps seconds (MySQL) or not (SQLite).
     *
     * @return Attribute<string|null, never>
     */
    protected function opensAt(): Attribute
    {
        return Attribute::get(fn (?string $value) => $value === null ? null : substr($value, 0, 5));
    }

    /** @return Attribute<string|null, never> */
    protected function closesAt(): Attribute
    {
        return Attribute::get(fn (?string $value) => $value === null ? null : substr($value, 0, 5));
    }
}
