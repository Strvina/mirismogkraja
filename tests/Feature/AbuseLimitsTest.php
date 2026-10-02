<?php

namespace Tests\Feature;

use App\Http\Controllers\ProducerMessageController;
use App\Jobs\NotifyFollowersOfProduct;
use App\Models\Category;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

/** What keeps one account from reaching everyone at once. */
class AbuseLimitsTest extends TestCase
{
    use RefreshDatabase;

    public function test_followers_hear_about_a_product_once_however_often_it_is_republished(): void
    {
        Bus::fake();
        $follower = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $producer->followers()->attach($follower);
        $product = Product::factory()->for($producer)->create(['status' => 'draft']);
        $form = fn (string $status) => [
            'category_id' => $product->category_id ?? Category::factory()->create()->id, 'name' => $product->name,
            'price' => 100, 'unit' => 'kg', 'stock_quantity' => 1, 'status' => $status,
        ];

        foreach (['active', 'archived', 'active', 'draft', 'active'] as $status) {
            $this->actingAs($producer->user)->put(route('producers.products.update', [$producer, $product]), $form($status))->assertSessionHasNoErrors();
        }

        // Counted where it is dispatched: in the test suite one app serves
        // every request, so an after-response job would run again later.
        Bus::assertDispatchedAfterResponseTimes(NotifyFollowersOfProduct::class, 1);
        $this->assertNotNull($product->fresh()->published_at);
    }

    public function test_a_producer_has_a_ceiling_on_products(): void
    {
        $producer = Producer::factory()->active()->create();
        Product::factory()->count(Product::MAX_PER_PRODUCER)->for($producer)->for(Category::factory()->create())
            ->sequence(fn ($sequence) => ['name' => "Proizvod {$sequence->index}", 'slug' => "proizvod-{$sequence->index}"])
            ->create();

        $this->actingAs($producer->user)->post(route('producers.products.store', $producer), [
            'category_id' => Category::factory()->create()->id, 'name' => 'Jedan previše', 'price' => 1, 'unit' => 'kg', 'stock_quantity' => 1, 'status' => 'draft',
        ])->assertSessionHasErrors('name');

        $this->assertSame(Product::MAX_PER_PRODUCER, $producer->products()->count());
    }

    public function test_an_account_can_start_only_so_many_new_conversations_a_day_but_keep_existing_ones(): void
    {
        $buyer = User::factory()->create();
        $producers = Producer::factory()->active()->count(ProducerMessageController::NEW_CONVERSATIONS_PER_DAY + 1)->create();

        foreach ($producers->take(ProducerMessageController::NEW_CONVERSATIONS_PER_DAY) as $producer) {
            $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Zdravo'])->assertSessionHasNoErrors();
        }

        // Past the per-minute route limit, so only the daily one answers.
        $this->travel(2)->minutes();
        $this->actingAs($buyer)->post(route('messages.store', $producers->last()->slug), ['body' => 'Zdravo'])->assertSessionHasErrors('body');

        // An existing conversation is not a new one.
        $this->actingAs($buyer)->post(route('messages.store', $producers->first()->slug), ['body' => 'Još nešto'])->assertSessionHasNoErrors();
        $this->assertSame(ProducerMessageController::NEW_CONVERSATIONS_PER_DAY + 1, ProducerMessage::count());

        $this->travel(25)->hours();
        $this->actingAs($buyer)->post(route('messages.store', $producers->last()->slug), ['body' => 'Zdravo'])->assertSessionHasNoErrors();
    }
}
