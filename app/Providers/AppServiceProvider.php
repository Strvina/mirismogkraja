<?php

namespace App\Providers;

use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use App\Observers\ActivityLogObserver;
use App\Services\SubscriptionService;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // One instance per request, so what it has looked up about plans is
        // shared by every section of a page and forgotten afterwards.
        $this->app->scoped(SubscriptionService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Short, stable aliases for polymorphic types (Favorite.favoritable_type)
        // instead of raw class names, which would break if a class were moved.
        // Not enforced app-wide (Spatie's own polymorphic relations rely on
        // being able to fall back to raw class names).
        // The 'household' key is the value already persisted in existing
        // favoritable_type rows (task 9.3's Household -> Producer rename
        // didn't touch stored data), so it stays even though the class
        // it points to is now Producer.
        Relation::morphMap([
            'household' => Producer::class,
            'product' => Product::class,
            // Reports can name a user too (task 21).
            'user' => User::class,
        ]);

        foreach (ActivityLogObserver::AUDITED as $model) {
            $model::observe(ActivityLogObserver::class);
        }
    }
}
