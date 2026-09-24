<?php

namespace App\Models;

use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory;

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
