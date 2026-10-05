<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\Product;
use App\Models\ProductAlert;
use App\Models\User;
use App\Support\NotificationText;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** "Čeka vas X kupaca": the producer's side of "Javi mi kad stigne". */
class WaitingBuyersTest extends TestCase
{
    use RefreshDatabase;

    private function soldOut(Producer $producer, array $attributes = []): Product
    {
        return Product::factory()->for($producer)->create(['status' => 'active', 'stock_quantity' => 0, ...$attributes]);
    }

    /** @return list<array<string, mixed>> */
    private function wantedNotifications(User $owner): array
    {
        return $owner->notifications()->get()->pluck('data')->where('type', 'product.wanted')->values()->all();
    }

    public function test_the_producer_hears_about_the_first_buyer_and_then_only_at_round_numbers(): void
    {
        $producer = Producer::factory()->active()->create();
        $product = $this->soldOut($producer, ['name' => 'Bagremov med']);

        foreach (range(1, 4) as $ignored) {
            $this->actingAs(User::factory()->create())->post(route('products.alert', $product->slug));
        }

        // The first and the third; not the second or the fourth.
        $notifications = $this->wantedNotifications($producer->user);
        $this->assertSame([1, 3], collect($notifications)->pluck('params.count')->sort()->values()->all());

        $text = NotificationText::for($notifications[0]);
        $this->assertSame('Kupci čekaju: Bagremov med', $text['title']);
        $this->assertStringContainsString('cekaju=1', $notifications[0]['url']);
    }

    public function test_asking_calling_off_and_asking_again_tells_the_producer_once(): void
    {
        $producer = Producer::factory()->active()->create();
        $product = $this->soldOut($producer);
        $buyer = User::factory()->create();

        foreach (range(1, 3) as $ignored) {
            $this->actingAs($buyer)->post(route('products.alert', $product->slug));
        }

        $this->assertCount(1, $this->wantedNotifications($producer->user));
    }

    public function test_the_dashboard_and_the_product_list_count_who_is_waiting(): void
    {
        $producer = Producer::factory()->active()->create();
        $honey = $this->soldOut($producer, ['name' => 'Med']);
        $jam = $this->soldOut($producer, ['name' => 'Džem']);
        $inStock = Product::factory()->for($producer)->create(['status' => 'active', 'stock_quantity' => 4]);

        foreach (User::factory()->count(2)->create() as $buyer) {
            ProductAlert::create(['user_id' => $buyer->id, 'product_id' => $honey->id]);
        }
        ProductAlert::create(['user_id' => User::factory()->create()->id, 'product_id' => $jam->id]);
        // Someone else's product is not this producer's demand.
        ProductAlert::create(['user_id' => User::factory()->create()->id, 'product_id' => $this->soldOut(Producer::factory()->active()->create())->id]);

        $this->actingAs($producer->user)->get(route('producers.index'))
            ->assertInertia(fn ($page) => $page->where('producers.0.waiting_buyers_count', 3));

        $this->actingAs($producer->user)->get(route('producers.products.index', $producer))
            ->assertInertia(fn ($page) => $page
                ->where('waitingTotal', 3)
                ->where('onlyWanted', false)
                ->has('products.data', 3));

        $this->actingAs($producer->user)->get(route('producers.products.index', ['producer' => $producer, 'cekaju' => 1]))
            ->assertInertia(fn ($page) => $page
                ->where('onlyWanted', true)
                ->has('products.data', 2)
                // Most wanted first.
                ->where('products.data.0.id', $honey->id)
                ->where('products.data.0.waiting_count', 2)
                ->where('products.data.1.id', $jam->id));

        $this->assertNotNull($inStock);
    }

    public function test_the_count_clears_once_the_buyers_have_been_told(): void
    {
        $producer = Producer::factory()->active()->create();
        $product = $this->soldOut($producer);
        ProductAlert::create(['user_id' => User::factory()->create()->id, 'product_id' => $product->id]);

        $product->update(['stock_quantity' => 10]);
        $this->artisan('products:send-alerts')->assertSuccessful();

        $this->actingAs($producer->user)->get(route('producers.products.index', $producer))
            ->assertInertia(fn ($page) => $page->where('waitingTotal', 0));
    }
}
