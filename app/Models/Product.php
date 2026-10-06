<?php

namespace App\Models;

use App\Models\Concerns\KeepsOldSlugs;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory, KeepsOldSlugs;

    /** Set only by an administrator; the owner cannot lift it. */
    public const STATUS_BLOCKED = 'blocked';

    /** A shop, not a warehouse: past this a producer's page stops being readable. */
    public const MAX_PER_PRODUCER = 500;

    /** What an owner may choose for their own listing. */
    public const OWNER_STATUSES = ['draft', 'active', 'archived'];

    protected $fillable = [
        'producer_id',
        'category_id',
        'name',
        'slug',
        'description',
        'price',
        'unit',
        'stock_quantity',
        'season_from',
        'season_to',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'season_from' => 'integer',
            'season_to' => 'integer',
            'published_at' => 'datetime',
            'price' => 'decimal:2',
        ];
    }

    public function producer(): BelongsTo
    {
        return $this->belongsTo(Producer::class, 'producer_id');
    }

    /**
     * A product is only public when its producer is too. The producer can be
     * missing entirely here: archiving an account soft-deletes its producers,
     * and the relation then resolves to null rather than to a blocked record.
     */
    public function isPubliclyVisible(): bool
    {
        return $this->status === 'active' && $this->producer?->status === 'active';
    }

    /**
     * What the public may see: listed as active, by a producer that is
     * itself published. The query twin of isPubliclyVisible().
     *
     * @param  Builder<Product>  $query
     */
    /** The same rule as the inSeason scope, for a product already loaded. */
    public function isInSeason(?int $month = null): bool
    {
        if ($this->season_from === null || $this->season_to === null) {
            return true;
        }

        $month ??= now()->month;

        return $this->season_from <= $this->season_to
            ? $month >= $this->season_from && $month <= $this->season_to
            : $month >= $this->season_from || $month <= $this->season_to;
    }

    /** Something a buyer can have now: in stock and in season. */
    public function isAvailable(): bool
    {
        return $this->stock_quantity > 0 && $this->isInSeason();
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(ProductAlert::class);
    }

    /**
     * In season in the given month (default: now). Products without a
     * season are available all year; a range may wrap the new year.
     */
    public function scopeInSeason(Builder $query, ?int $month = null): void
    {
        $month ??= now()->month;
        [$from, $to] = [$query->qualifyColumn('season_from'), $query->qualifyColumn('season_to')];

        $query->where(fn (Builder $any) => $any
            ->whereNull($from)
            ->orWhereNull($to)
            ->orWhere(fn (Builder $plain) => $plain->whereColumn($from, '<=', $to)->where($from, '<=', $month)->where($to, '>=', $month))
            ->orWhere(fn (Builder $wrapping) => $wrapping->whereColumn($from, '>', $to)->where(fn (Builder $either) => $either->where($from, '<=', $month)->orWhere($to, '>=', $month))));
    }

    /**
     * Has a season of its own, and the month (default: now) is in it. Unlike
     * inSeason, a product sold all year does not count: this is for "what is
     * in season", where listing everything would say nothing.
     */
    public function scopeSeasonal(Builder $query, ?int $month = null): void
    {
        $query
            ->whereNotNull($query->qualifyColumn('season_from'))
            ->whereNotNull($query->qualifyColumn('season_to'))
            ->inSeason($month);
    }

    public function scopePublished(Builder $query): void
    {
        $query->where($query->qualifyColumn('status'), 'active')->whereHas('producer', fn (Builder $producer) => $producer->published());
    }

    /**
     * What a catalogue card shows, and nothing else: the whole row - and the
     * whole producer behind it, story and phone number included - would make
     * a page of cards several times heavier than what it displays.
     *
     * @param  Builder<Product>  $query
     */
    public function scopeWithCardData(Builder $query): void
    {
        $query
            ->select($query->qualifyColumns(['id', 'producer_id', 'name', 'slug', 'price', 'unit', 'stock_quantity', 'season_from', 'season_to', 'created_at']))
            ->with(['images:id,product_id,path,order', 'producer:id,name,city']);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('order');
    }

    public function favorites(): MorphMany
    {
        return $this->morphMany(Favorite::class, 'favoritable');
    }

    /**
     * Messages that were opened from this product's page. Together with
     * favourites these are the only real interest signals the platform
     * records - there is no order to count, by design.
     */
    public function inquiries(): HasMany
    {
        return $this->hasMany(ProducerMessage::class);
    }
}
