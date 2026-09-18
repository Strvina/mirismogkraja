<?php

namespace Tests\Feature;

use App\Models\Favorite;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FavoritesPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login()
    {
        $this->get(route('favorites.index'))->assertRedirect('/login');
    }

    public function test_lists_favorited_producers_and_products_separately()
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->create(['name' => 'Moje omiljeno']);
        $product = Product::factory()->create(['name' => 'Omiljeni proizvod']);

        Favorite::create(['user_id' => $user->id, 'favoritable_type' => 'household', 'favoritable_id' => $producer->id]);
        Favorite::create(['user_id' => $user->id, 'favoritable_type' => 'product', 'favoritable_id' => $product->id]);

        $response = $this->actingAs($user)->get(route('favorites.index'));

        $response->assertInertia(fn ($page) => $page->has('producers', 1)
            ->where('producers.0.name', 'Moje omiljeno')
            ->has('products', 1)
            ->where('products.0.name', 'Omiljeni proizvod'));
    }

    public function test_only_shows_own_favorites()
    {
        $user = User::factory()->create();
        Favorite::factory()->create(); // someone else's

        $response = $this->actingAs($user)->get(route('favorites.index'));

        $response->assertInertia(fn ($page) => $page->has('producers', 0));
    }
}
