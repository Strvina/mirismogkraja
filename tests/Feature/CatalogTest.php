<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Services\ProducerStatistics;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_catalogue_lists_published_products_by_category_with_prices(): void
    {
        $producer = Producer::factory()->active()->create(['name' => 'Pčelarstvo Ilić', 'phone' => '+381 64 123 4567']);
        $honey = Category::factory()->create(['name' => 'Med']);
        $rakija = Category::factory()->create(['name' => 'Rakija']);

        Product::factory()->for($producer)->create(['name' => 'Šljivovica', 'category_id' => $rakija->id, 'price' => 1200, 'unit' => 'l', 'status' => 'active', 'stock_quantity' => 5]);
        Product::factory()->for($producer)->create(['name' => 'Livadski med', 'category_id' => $honey->id, 'price' => 900, 'unit' => 'kg', 'status' => 'active', 'stock_quantity' => 0]);
        Product::factory()->for($producer)->create(['name' => 'Bagremov med', 'category_id' => $honey->id, 'price' => 1100, 'unit' => 'kg', 'status' => 'active', 'stock_quantity' => 3]);
        Product::factory()->for($producer)->create(['name' => 'U pripremi', 'category_id' => $honey->id, 'status' => 'draft']);

        $response = $this->get(route('marketplace.catalog', $producer->slug))->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->component('marketplace/catalog')
            ->where('products.total', 3)
            ->where('products.data.0.name', 'Bagremov med')
            ->where('products.data.0.category', 'Med')
            ->where('products.data.0.available', true)
            ->where('products.data.1.name', 'Livadski med')
            ->where('products.data.1.available', false)
            ->where('products.data.2.name', 'Šljivovica')
            ->where('producer.has_phone', true)
            // The number is not in the page until it is asked for.
            ->missing('phone')
            ->missing('producer.phone')
            ->missing('producer.user_id'));

        // The link preview already carries the first prices.
        $response->assertSee('Pčelarstvo Ilić — ponuda i cene', false);
        $response->assertSee('Bagremov med 1.100 RSD/kg', false);
        $response->assertSee('"@type":"ItemList"', false);
    }

    public function test_a_producer_the_public_cannot_see_has_no_catalogue(): void
    {
        $this->get(route('marketplace.catalog', Producer::factory()->create(['status' => 'pending'])->slug))->assertNotFound();
        $this->get(route('marketplace.catalog', Producer::factory()->create(['status' => 'blocked'])->slug))->assertNotFound();
    }

    public function test_an_old_address_still_leads_to_the_catalogue(): void
    {
        $producer = Producer::factory()->active()->create(['slug' => 'stari-naziv']);
        $producer->update(['slug' => 'novi-naziv']);

        $this->get('/katalog/stari-naziv')->assertRedirect(url('/katalog/novi-naziv'));
    }

    public function test_opening_the_catalogue_is_counted_once_per_visitor(): void
    {
        $producer = Producer::factory()->active()->create();
        $browser = ['User-Agent' => 'Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile'];

        $this->withHeaders($browser)->get(route('marketplace.catalog', $producer->slug))->assertOk();
        $this->withHeaders($browser)->get(route('marketplace.catalog', $producer->slug))->assertOk();
        // Viber fetching the link for its preview is not a reader.
        $this->withHeaders(['User-Agent' => 'Viber/20.1 LinkPreview'])->get(route('marketplace.catalog', $producer->slug))->assertOk();

        $this->assertSame(1, (int) DB::table('producer_stats')
            ->where('producer_id', $producer->id)
            ->where('event', ProducerStatistics::CATALOG_VIEW)
            ->sum('hits'));
    }

    public function test_the_owner_is_not_offered_to_message_themselves(): void
    {
        $producer = Producer::factory()->active()->create();

        $this->get(route('marketplace.catalog', $producer->slug))->assertInertia(fn ($page) => $page->where('canMessage', true));
        $this->actingAs($producer->user)->get(route('marketplace.catalog', $producer->slug))
            ->assertInertia(fn ($page) => $page->where('canMessage', false));
    }
}
