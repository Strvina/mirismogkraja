<?php

namespace App\Providers;

use App\Models\Post;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use App\Observers\ActivityLogObserver;
use App\Support\Health;
use Illuminate\Contracts\Validation\UncompromisedVerifier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Events\DiagnosingHealth;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\NotPwnedVerifier;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // The leak check is a call to another service in the middle of
        // signing up: three seconds for it, not the default thirty. When it
        // does not answer, the password is let through.
        $this->app->singleton(UncompromisedVerifier::class, fn ($app) => new NotPwnedVerifier($app[HttpFactory::class], 3));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $live = $this->app->isProduction();

        // Mistakes caught while developing rather than on the live site: a
        // relation loaded one row at a time (the N+1 that makes a list
        // slow) and an attribute dropped in silence because it is not
        // fillable both throw here. Never in production, where a slow page
        // is better than a broken one.
        Model::preventLazyLoading(! $live);
        Model::preventSilentlyDiscardingAttributes(! $live);

        // migrate:fresh, migrate:refresh, migrate:reset and db:wipe refuse
        // to run against the live database, whoever types them.
        DB::prohibitDestructiveCommands($live);

        // What a password has to be. On the live site it also may not be
        // one found in a known leak - "lozinka123" passes every other rule
        // and is the first one tried against an account. Checked without
        // sending the password anywhere: only the first five characters of
        // its hash leave the server.
        Password::defaults(fn () => $this->app->isProduction()
            ? Password::min(8)->letters()->numbers()->uncompromised()
            : Password::min(8));

        // /up, for an uptime monitor: a page that renders while the
        // database is down, or while cron has stopped, is not "up".
        Event::listen(DiagnosingHealth::class, fn () => Health::assertUp());

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
