<?php

namespace App\Models;

use Database\Factories\ProducerFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
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
        return $this->belongsTo(User::class)->withTrashed();
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

    /** Memberships, paid and pending (task 20.1). */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(ProducerSubscription::class, 'household_id');
    }

    /**
     * The membership in force right now, if any - the one running longest
     * when a renewal has already been paid. Loaded in one query for a whole
     * list, which is how the admin panel shows every producer's plan.
     */
    public function currentMembership(): HasOne
    {
        return $this->hasOne(ProducerSubscription::class, 'household_id')
            ->ofMany(['ends_at' => 'max'], fn ($query) => $query->active());
    }

    /**
     * Buyers whose conversation with this producer is closed. Either side
     * can close it; blocked_by says which, since only that side may reopen it.
     */
    public function blockedBuyers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'conversation_blocks', 'household_id', 'buyer_id')->withPivot('blocked_by');
    }

    /** Whether the conversation with this buyer is closed, by either side. */
    public function hasBlocked(User $buyer): bool
    {
        return $this->blockedBuyers()->whereKey($buyer->id)->exists();
    }

    /** Who closed the conversation with this buyer: 'producer', 'buyer' or nobody. */
    public function blockedBy(User $buyer): ?string
    {
        return $this->blockedBuyers()->whereKey($buyer->id)->value('blocked_by');
    }

    /** People who asked to hear when this producer lists something new. */
    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'producer_follows', 'household_id', 'user_id');
    }

    /**
     * Approved by an admin and so visible to the public (task 2.6). Every
     * public query starts here, so a pending or blocked producer cannot leak
     * through one that forgot to ask.
     *
     * @param  Builder<Producer>  $query
     */
    public function scopePublished(Builder $query): void
    {
        $query->where($query->qualifyColumn('status'), 'active');
    }

    /**
     * Everything the directory card shows - and not the story and contact
     * details behind it: rating, counts and the two latest reviews.
     *
     * @param  Builder<Producer>  $query
     */
    public function scopeWithCardData(Builder $query): void
    {
        $query
            ->select($query->qualifyColumns(['id', 'name', 'slug', 'city', 'description', 'cover_image_path', 'logo_path', 'verified_at', 'delivery_methods']))
            ->withAvg(['reviews' => fn ($reviews) => $reviews->approved()], 'rating')
            ->withCount([
                'reviews' => fn ($reviews) => $reviews->approved(),
                'products' => fn ($products) => $products->where('status', 'active'),
            ])
            ->with(['reviews' => fn ($reviews) => $reviews->approved()->latest()->limit(2)->with('user:id,name,avatar_path')]);
    }

    public function isVerified(): bool
    {
        return $this->verified_at !== null;
    }

    public function isFounding(): bool
    {
        return $this->founding_number !== null;
    }

    /**
     * Saved by buyers. Counted as the popularity signal on the homepage -
     * it's a deliberate action by a signed-in person, unlike a page view.
     */
    public function favorites(): MorphMany
    {
        return $this->morphMany(Favorite::class, 'favoritable');
    }
}
