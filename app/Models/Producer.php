<?php

namespace App\Models;

use Database\Factories\ProducerFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Producer extends Model
{
    /** @use HasFactory<ProducerFactory> */
    use HasFactory, SoftDeletes;

    /**
     * The underlying table predates this class's Household -> Producer
     * rename (task 9.3) and was intentionally left as-is to avoid a
     * disruptive schema migration - so it must be pinned explicitly.
     */
    protected $table = 'households';

    /**
     * How a producer can get goods to a buyer, keyed by what's stored in
     * `delivery_methods` (task 13).
     *
     * @var array<string, string>
     */
    public const DELIVERY_METHODS = [
        'licna_dostava' => 'Lična dostava',
        'kurirska_sluzba' => 'Kurirska služba',
        'preuzimanje' => 'Lično preuzimanje',
    ];

    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'description',
        'story',
        'address',
        'city',
        'delivery_methods',
        'phone',
        'contact_email',
        'lat',
        'lng',
        'cover_image_path',
        'logo_path',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'delivery_methods' => 'array',
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
            // withAvg() aggregates come back as strings on MySQL but numbers
            // on SQLite; pin the type so the frontend always gets a number.
            'reviews_avg_rating' => 'float',
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

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'household_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProducerImage::class, 'household_id')->orderBy('order');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ProducerMessage::class, 'household_id');
    }
}
