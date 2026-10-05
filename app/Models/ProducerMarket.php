<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A place where a producer sells in person - a market stall, a fair, a shop - and when. */
class ProducerMarket extends Model
{
    /** A page lists them all, so a producer gets a handful, not a timetable. */
    public const MAX_PER_PRODUCER = 8;

    /** What the public pages print. */
    public const PUBLIC_COLUMNS = ['id', 'producer_id', 'name', 'city', 'days', 'opens_at', 'closes_at', 'note'];

    protected $fillable = ['name', 'city', 'days', 'opens_at', 'closes_at', 'note'];

    protected function casts(): array
    {
        return ['days' => 'array'];
    }

    public function producer(): BelongsTo
    {
        return $this->belongsTo(Producer::class);
    }

    /** "07:00", whether the database keeps seconds (MySQL) or not (SQLite). */
    protected function opensAt(): Attribute
    {
        return Attribute::get(fn (?string $value) => $value === null ? null : substr($value, 0, 5));
    }

    protected function closesAt(): Attribute
    {
        return Attribute::get(fn (?string $value) => $value === null ? null : substr($value, 0, 5));
    }
}
