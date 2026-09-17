<?php

namespace App\Providers;

use App\Models\Household;
use App\Models\Product;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
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
        Relation::morphMap([
            'household' => Household::class,
            'product' => Product::class,
        ]);
    }
}
