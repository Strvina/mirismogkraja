<?php

namespace Tests\Feature;

use App\Models\Boost;
use App\Models\Producer;
use App\Models\Product;
use App\Models\SlugRedirect;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class PruneOrphansTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_removes_what_points_at_something_gone_and_keeps_the_rest(): void
    {
        $buyer = User::factory()->create();
        $live = Producer::factory()->active()->create();
        $archived = Producer::factory()->active()->create();
        $kept = Product::factory()->for($live)->create();
        $ofArchived = Product::factory()->for($archived)->create();
        $deleted = Product::factory()->for($live)->create(['slug' => 'stari-ajvar']);

        foreach ([['producer', $live->id], ['producer', $archived->id], ['product', $kept->id], ['product', $ofArchived->id], ['product', $deleted->id]] as [$type, $id]) {
            $buyer->favorites()->create(['favoritable_type' => $type, 'favoritable_id' => $id]);
        }
        DB::table('producer_follows')->insert([['user_id' => $buyer->id, 'producer_id' => $live->id], ['user_id' => $buyer->id, 'producer_id' => $archived->id]]);
        DB::table('product_alerts')->insert([['user_id' => $buyer->id, 'product_id' => $kept->id], ['user_id' => $buyer->id, 'product_id' => $ofArchived->id]]);
        SlugRedirect::create(['model_type' => 'product', 'old_slug' => 'jos-stariji-ajvar', 'model_id' => $deleted->id]);
        SlugRedirect::create(['model_type' => 'producer', 'old_slug' => 'staro-ime', 'model_id' => $archived->id]);
        // Money received for a product since deleted: the record stays.
        Boost::create(['producer_id' => $live->id, 'boostable_type' => Boost::PRODUCT, 'boostable_id' => $deleted->id, 'status' => Boost::STATUS_EXPIRED, 'reference' => '97-1', 'amount_rsd' => 500, 'days' => 7]);

        $gone = User::factory()->create();
        foreach ([$buyer, $gone] as $user) {
            $user->notifications()->create(['id' => (string) Str::uuid(), 'type' => 'site', 'data' => ['url' => '/']]);
        }

        $deleted->delete();
        $archived->delete();
        $gone->delete();

        $this->artisan('database:prune-orphans')->assertSuccessful();

        $this->assertEqualsCanonicalizing(
            [['producer', $live->id], ['product', $kept->id]],
            $buyer->favorites()->get()->map(fn ($favorite) => [$favorite->favoritable_type, $favorite->favoritable_id])->all(),
        );
        $this->assertSame([$live->id], DB::table('producer_follows')->pluck('producer_id')->all());
        $this->assertSame([$kept->id], DB::table('product_alerts')->pluck('product_id')->all());
        $this->assertSame(['staro-ime'], SlugRedirect::pluck('old_slug')->all());
        $this->assertSame(1, Boost::count());
        $this->assertSame([$buyer->id], DB::table('notifications')->pluck('notifiable_id')->map(fn ($id) => (int) $id)->all());

        // A second run finds nothing more to do.
        $this->artisan('database:prune-orphans')->assertSuccessful();
        $this->assertSame(2, $buyer->favorites()->count());
    }

    public function test_it_runs_every_week(): void
    {
        $this->artisan('schedule:list')->expectsOutputToContain('database:prune-orphans');
    }
}
