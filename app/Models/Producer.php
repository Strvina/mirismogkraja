<?php

namespace App\Models;

use Database\Factories\ProducerFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Producer extends Model
{
    /** @use HasFactory<ProducerFactory> */
    use HasFactory;

    /**
     * The underlying table predates this class's Household -> Producer
     * rename (task 9.3) and was intentionally left as-is to avoid a
     * disruptive schema migration - so it must be pinned explicitly.
     */
    protected $table = 'households';

    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'description',
        'address',
        'city',
        'lat',
        'lng',
        'cover_image_path',
        'logo_path',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'household_id');
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'household_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'household_id');
    }
}
