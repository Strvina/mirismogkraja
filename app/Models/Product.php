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
        'household_id',
        'category_id',
        'name',
        'slug',
        'description',
        'price',
        'unit',
        'stock_quantity',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'price' => 'decimal:2',
        ];
    }

    public function producer(): BelongsTo
    {
        return $this->belongsTo(Producer::class, 'household_id');
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
    public function scopePublished(Builder $query): void
    {
        $query->where($query->qualifyColumn('status'), 'active')->whereHas('producer', fn (Builder $producer) => $producer->published());
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
