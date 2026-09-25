<?php

namespace App\Models;

use Database\Factories\ProducerFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
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
        // Set only by an admin, but it still has to be writable through
        // update() - a non-fillable attribute is dropped in silence.
        'verified_at',
    ];

    protected function casts(): array
    {
        return [
            'delivery_methods' => 'array',
            'founding_joined_at' => 'datetime',
            'verified_at' => 'datetime',
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

    /**
     * Saved by buyers. Counted as the popularity signal on the homepage -
     * it's a deliberate action by a signed-in person, unlike a page view.
     */
    /** People who asked to hear when this producer lists something new. */
    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'producer_follows', 'household_id', 'user_id');
    }

    public function isVerified(): bool
    {
        return $this->verified_at !== null;
    }

    public function isFounding(): bool
    {
        return $this->founding_number !== null;
    }

    public function favorites(): MorphMany
    {
        return $this->morphMany(Favorite::class, 'favoritable');
    }
}
