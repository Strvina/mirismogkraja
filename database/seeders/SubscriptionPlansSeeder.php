<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

/**
 * The three membership tiers (task 20.1). Prices are starting points the
 * owner changes from the admin panel - they live in rows precisely so they
 * are not a deploy away.
 */
class SubscriptionPlansSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'slug' => 'basic',
                'name' => 'Basic',
                'description' => 'Profil, fotografije, proizvodi, cenovnik, kontakt i pojavljivanje u pretrazi.',
                'price_rsd' => 2990,
                'level' => 0,
                'features' => [],
            ],
            [
                'slug' => 'premium',
                'name' => 'Premium',
                'description' => 'Sve iz Basic paketa, uz oznaku premium, mesto u sekciji istaknutih i statistiku profila.',
                'price_rsd' => 5990,
                'level' => 1,
                'features' => ['premium_badge', 'featured_section', 'statistics'],
            ],
            [
                'slug' => 'pro',
                'name' => 'Pro',
                'description' => 'Sve iz Premium paketa, uz pojavljivanje na početnoj strani i prednost u podršci.',
                'price_rsd' => 9990,
                'level' => 2,
                'features' => ['premium_badge', 'featured_section', 'statistics', 'homepage', 'priority_support'],
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::updateOrCreate(
                ['slug' => $plan['slug']],
                [...$plan, 'duration_days' => 365, 'is_active' => true],
            );
        }
    }
}
