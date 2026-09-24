<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Favorite;
use App\Models\Producer;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HomePageTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_shows_real_producers_products_and_categories(): void
    {
        $category = Category::factory()->create(['name' => 'Med i pčelinji proizvodi']);
        $producer = Producer::factory()->active()->create(['name' => 'Pčelinjak Medovina', 'city' => 'Niš']);
        Product::factory()->for($producer)->for($category)->create(['name' => 'Bagremov med', 'status' => 'active']);

        $this->get('/')->assertOk()->assertInertia(
            fn ($page) => $page->component('welcome')
                ->has('newProducers', 1)
                ->where('newProducers.0.name', 'Pčelinjak Medovina')
                ->where('newProducers.0.city', 'Niš')
                ->where('newProducers.0.tags.0', 'Med i pčelinji proizvodi')
                ->has('popularProducts', 1)
                ->where('popularProducts.0.name', 'Bagremov med')
                ->has('categories', 1)
                ->where('categories.0.name', 'Med i pčelinji proizvodi')
        );
    }

    public function test_it_excludes_inactive_producers_and_products(): void
    {
        $pendingProducer = Producer::factory()->create(['status' => 'pending']);
        Product::factory()->for($pendingProducer)->create(['status' => 'active']);

        $activeProducer = Producer::factory()->active()->create();
        Product::factory()->for($activeProducer)->create(['status' => 'draft']);

        $this->get('/')->assertOk()->assertInertia(
            fn ($page) => $page->has('newProducers', 1)
                ->has('popularProducts', 0)
                ->has('categories', 0)
        );
    }

    /**
     * "Popular" has to mean something the platform actually recorded, so a
     * producer nobody has saved or reviewed must not appear there just to
     * fill the slider.
     */
    public function test_popular_producers_are_ranked_by_favorites_and_reviews(): void
    {
        Producer::factory()->active()->create(['name' => 'Niko ih ne zna']);
        $saved = Producer::factory()->active()->create(['name' => 'Sačuvani']);
        $reviewed = Producer::factory()->active()->create(['name' => 'Ocenjeni']);

        Favorite::factory()->count(2)->create(['favoritable_type' => 'household', 'favoritable_id' => $saved->id]);
        Review::factory()->for($reviewed, 'producer')->create();

        $this->get('/')->assertOk()->assertInertia(
            fn ($page) => $page->has('popularProducers', 2)
                ->where('popularProducers.0.name', 'Sačuvani')
                ->where('popularProducers.1.name', 'Ocenjeni')
                // Still listed under "new", just not under "popular".
                ->has('newProducers', 3)
        );
    }

    /**
     * A rating shown on the homepage is a public number, so it must be built
     * from published reviews only.
     */
    public function test_a_pending_review_does_not_count_towards_the_public_rating(): void
    {
        $producer = Producer::factory()->active()->create();
        Review::factory()->pending()->for($producer, 'producer')->for(User::factory())->create(['rating' => 1]);

        $this->get('/')->assertOk()->assertInertia(
            fn ($page) => $page->where('newProducers.0.rating', null)
                ->where('newProducers.0.reviews_count', 0)
                ->has('popularProducers', 0)
        );
    }
}
