<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicProducerListTest extends TestCase
{
    use RefreshDatabase;

    public function test_list_only_shows_active_producers()
    {
        Producer::factory()->active()->create(['name' => 'Aktivno']);
        Producer::factory()->create(['name' => 'Na cekanju', 'status' => 'pending']);
        Producer::factory()->create(['name' => 'Blokirano', 'status' => 'blocked']);

        $response = $this->get(route('marketplace.producers.index'));

        $response->assertInertia(fn ($page) => $page->has('producers.data', 1)
            ->where('producers.data.0.name', 'Aktivno'));
    }

    public function test_each_card_carries_its_rating_counts_and_latest_reviews()
    {
        $producer = Producer::factory()->active()->create();
        Product::factory()->for($producer)->create(['status' => 'active']);
        Product::factory()->for($producer)->create(['status' => 'draft']);

        Review::factory()->for($producer)->create(['rating' => 5, 'comment' => 'Odlično']);
        Review::factory()->for($producer)->create(['rating' => 3, 'comment' => 'Solidno']);

        $this->get(route('marketplace.producers.index'))->assertInertia(
            fn ($page) => $page->where('producers.data.0.reviews_avg_rating', 4)
                ->where('producers.data.0.reviews_count', 2)
                ->where('producers.data.0.products_count', 1)
                ->has('producers.data.0.reviews', 2)
                ->has('producers.data.0.reviews.0.user.name')
        );
    }

    public function test_list_can_be_filtered_by_city()
    {
        Producer::factory()->active()->create(['name' => 'Leskovacko', 'city' => 'Leskovac']);
        Producer::factory()->active()->create(['name' => 'Vranjsko', 'city' => 'Vranje']);

        $response = $this->get(route('marketplace.producers.index', ['city' => 'Vranje']));

        $response->assertInertia(fn ($page) => $page->has('producers.data', 1)
            ->where('producers.data.0.name', 'Vranjsko'));
    }

    /** Producers are searchable by name, place and their own description. */
    public function test_producers_can_be_searched(): void
    {
        Producer::factory()->active()->create(['name' => 'Pcelinjak Medovina', 'city' => 'Nis', 'description' => 'Bagremov med']);
        Producer::factory()->active()->create(['name' => 'Mlekara Zapis', 'city' => 'Zlatibor', 'description' => 'Kajmak i sir']);

        $this->get(route('marketplace.producers.index', ['q' => 'medov']))->assertInertia(
            fn ($page) => $page->has('producers.data', 1)
                ->where('producers.data.0.name', 'Pcelinjak Medovina')
                ->where('filters.q', 'medov')
        );

        // City and description are part of the same search.
        $this->get(route('marketplace.producers.index', ['q' => 'zlatibor']))
            ->assertInertia(fn ($page) => $page->has('producers.data', 1));

        $this->get(route('marketplace.producers.index', ['q' => 'kajmak']))
            ->assertInertia(fn ($page) => $page->has('producers.data', 1));
    }

    /** The term and the city filter narrow the list together. */
    public function test_search_and_city_filter_combine(): void
    {
        Producer::factory()->active()->create(['name' => 'Med i vino', 'city' => 'Nis']);
        Producer::factory()->active()->create(['name' => 'Med i sir', 'city' => 'Leskovac']);

        $this->get(route('marketplace.producers.index', ['q' => 'med', 'city' => 'Nis']))->assertInertia(
            fn ($page) => $page->has('producers.data', 1)->where('producers.data.0.city', 'Nis')
        );
    }
}
