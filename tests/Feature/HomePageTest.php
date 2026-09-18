<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
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
                ->has('producers', 1)
                ->where('producers.0.name', 'Pčelinjak Medovina')
                ->where('producers.0.city', 'Niš')
                ->where('producers.0.tags.0', 'Med i pčelinji proizvodi')
                ->has('products', 1)
                ->where('products.0.name', 'Bagremov med')
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
            fn ($page) => $page->has('producers', 1)
                ->has('products', 0)
                ->has('categories', 0)
        );
    }
}
