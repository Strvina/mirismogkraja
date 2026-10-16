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

    public function test_list_can_be_sorted_by_rating_and_by_number_of_reviews()
    {
        $few = Producer::factory()->active()->create(['name' => 'A malo ocena']);
        $many = Producer::factory()->active()->create(['name' => 'B mnogo ocena']);
        Producer::factory()->active()->create(['name' => 'C bez ocena']);

        Review::factory()->for($few)->create(['rating' => 5]);
        Review::factory()->for($many)->count(3)->create(['rating' => 4]);
        // Not yet approved: counts for neither order.
        Review::factory()->pending()->for($few)->count(5)->create(['rating' => 1]);

        $names = fn (array $query) => collect($this->get(route('marketplace.producers.index', $query))->viewData('page')['props']['producers']['data'])->pluck('name')->all();

        $this->assertSame(['A malo ocena', 'B mnogo ocena', 'C bez ocena'], $names([]));
        $this->assertSame(['A malo ocena', 'B mnogo ocena', 'C bez ocena'], $names(['sort' => 'rating']));
        $this->assertSame(['B mnogo ocena', 'A malo ocena', 'C bez ocena'], $names(['sort' => 'reviews']));
        // An order the list does not know falls back to its own.
        $this->assertSame(['A malo ocena', 'B mnogo ocena', 'C bez ocena'], $names(['sort' => 'drop table']));

        $this->get(route('marketplace.producers.index', ['sort' => 'reviews']))->assertInertia(fn ($page) => $page->where('filters.sort', 'reviews'));
        $this->get(route('marketplace.producers.index', ['sort' => 'nesto']))->assertInertia(fn ($page) => $page->where('filters.sort', null));
    }

    public function test_newest_producers_come_first_when_asked()
    {
        Producer::factory()->active()->create(['name' => 'Stari', 'created_at' => now()->subYear()]);
        Producer::factory()->active()->create(['name' => 'Novi', 'created_at' => now()->subDay()]);

        $this->get(route('marketplace.producers.index', ['sort' => 'newest']))
            ->assertInertia(fn ($page) => $page->where('producers.data.0.name', 'Novi')->where('producers.data.1.name', 'Stari'));
    }
}
