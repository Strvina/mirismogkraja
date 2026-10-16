<?php

namespace App\Console\Commands;

use App\Models\Campaign;
use App\Models\Post;
use App\Models\Producer;
use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Removes what points at something that is no longer there.
 *
 * Favourites and old addresses name their target by a type and an id
 * rather than a foreign key, so the database cannot remove them along with
 * it. Follows and "tell me when it is back" do have a foreign key, but an
 * archived producer is only marked deleted (its conversations stay
 * readable), so nothing removes those either. None of these rows shows
 * anywhere, and none of them can ever be acted on: they only pile up.
 *
 * Not removed, on purpose: payments for a boost of a product since deleted
 * (they are the record of money received), reports (the admin's record),
 * and the activity log (pruned by age on its own).
 *
 * Weekly (routes/console.php); safe to run at any time.
 */
class PruneOrphans extends Command
{
    protected $signature = 'database:prune-orphans';

    protected $description = 'Delete favourites, follows, alerts, notifications and old addresses that point at something gone';

    public function handle(): int
    {
        $removed = [
            'favourites of a producer' => DB::table('favorites')
                ->where('favoritable_type', 'producer')
                ->whereNotExists(fn (Builder $query) => $this->liveProducer($query, 'favorites.favoritable_id'))
                ->delete(),
            'favourites of a product' => DB::table('favorites')
                ->where('favoritable_type', 'product')
                ->whereNotExists(fn (Builder $query) => $query->selectRaw('1')
                    ->from('products')
                    ->join('producers', 'producers.id', '=', 'products.producer_id')
                    ->whereColumn('products.id', 'favorites.favoritable_id')
                    ->whereNull('producers.deleted_at'))
                ->delete(),
            'follows of an archived producer' => DB::table('producer_follows')
                ->whereNotExists(fn (Builder $query) => $this->liveProducer($query, 'producer_follows.producer_id'))
                ->delete(),
            'alerts on an archived producer\'s products' => DB::table('product_alerts')
                ->whereNotExists(fn (Builder $query) => $query->selectRaw('1')
                    ->from('products')
                    ->join('producers', 'producers.id', '=', 'products.producer_id')
                    ->whereColumn('products.id', 'product_alerts.product_id')
                    ->whereNull('producers.deleted_at'))
                ->delete(),
            // A deleted account is anonymised, and nobody reads its bell.
            'notifications of a deleted account' => DB::table('notifications')
                ->where('notifiable_type', 'user')
                ->whereNotExists(fn (Builder $query) => $query->selectRaw('1')
                    ->from('users')
                    ->whereColumn('users.id', 'notifications.notifiable_id')
                    ->whereNull('users.deleted_at'))
                ->delete(),
            // An archived producer keeps its old addresses: links to its
            // conversations still go through them. Only rows gone for good.
            'old addresses of something deleted' => collect([Producer::class, Product::class, Post::class, Campaign::class])
                ->sum(function (string $class) {
                    $model = new $class;
                    $table = $model->getTable();

                    return DB::table('slug_redirects')
                        ->where('model_type', $model->getMorphClass())
                        ->whereNotExists(fn (Builder $query) => $query->selectRaw('1')->from($table)->whereColumn("{$table}.id", 'slug_redirects.model_id'))
                        ->delete();
                }),
        ];

        foreach ($removed as $what => $count) {
            $this->components->twoColumnDetail($what, (string) $count);
        }

        return self::SUCCESS;
    }

    private function liveProducer(Builder $query, string $column): Builder
    {
        return $query->selectRaw('1')
            ->from('producers')
            ->whereColumn('producers.id', $column)
            ->whereNull('producers.deleted_at');
    }
}
