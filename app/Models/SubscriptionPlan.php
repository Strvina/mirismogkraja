<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A yearly membership tier. Prices and features are rows, not
 * code, because the owner changes them from the admin panel.
 *
 * @property int $id
 * @property string $slug
 * @property string $name
 * @property string|null $description
 * @property int $price_rsd
 * @property int $duration_days
 * @property list<string>|null $features
 * @property int $level
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, ProducerSubscription> $subscriptions
 */
class SubscriptionPlan extends Model
{
    /**
     * Feature keys a plan may unlock. The application asks for these by
     * name, so a plan's contents can change without touching the code that
     * checks them.
     *
     * @var array<string, string>
     */
    public const FEATURES = [
        'premium_badge' => 'Oznaka premium na profilu',
        'featured_section' => 'Pojavljivanje u sekciji istaknutih',
        'homepage' => 'Pojavljivanje na početnoj strani',
        'statistics' => 'Statistika profila i proizvoda',
        'priority_support' => 'Prednost u podršci',
    ];

    protected $fillable = [
        'slug',
        'name',
        'description',
        'price_rsd',
        'duration_days',
        'features',
        'level',
        'is_active',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'features' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /** @return HasMany<ProducerSubscription, $this> */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(ProducerSubscription::class);
    }

    public function has(string $feature): bool
    {
        return in_array($feature, $this->features ?? [], true);
    }
}
