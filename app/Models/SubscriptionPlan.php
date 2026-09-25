<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A yearly membership tier (task 20.1). Prices and features are rows, not
 * code, because the owner changes them from the admin panel.
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

    protected function casts(): array
    {
        return [
            'features' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(ProducerSubscription::class);
    }

    public function has(string $feature): bool
    {
        return in_array($feature, $this->features ?? [], true);
    }
}
