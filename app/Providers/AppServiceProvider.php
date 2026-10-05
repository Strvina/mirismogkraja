<?php

namespace App\Providers;

use App\Models\Post;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use App\Observers\ActivityLogObserver;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Events\DiagnosingHealth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Vite;
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
        // /up, for an uptime monitor: a page that renders while the
        // database is down is not "up".
        Event::listen(DiagnosingHealth::class, function () {
            DB::connection()->getPdo();
            Cache::get('health-check');
        });

        // The browser tests run on the built assets even while `composer
        // dev` is running alongside: pointed at a hot file that never
        // exists, Vite never reaches for the dev server.
        if (config('app.e2e')) {
            Vite::useHotFile(storage_path('framework/e2e.hot'));
        }

        // Short, stable aliases for polymorphic types (Favorite.favoritable_type)
        // instead of raw class names, which would break if a class were moved.
        // Not enforced app-wide (Spatie's own polymorphic relations rely on
        // being able to fall back to raw class names).
        Relation::morphMap([
            'producer' => Producer::class,
            'product' => Product::class,
            // Old addresses of renamed posts are kept by this name.
            'post' => Post::class,
            // Reports can name a user too.
            'user' => User::class,
        ]);

        foreach (ActivityLogObserver::AUDITED as $model) {
            $model::observe(ActivityLogObserver::class);
        }
    }
}
