<?php

namespace Tests\Feature;

use App\Models\Favorite;
use App\Models\Household;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FavoriteToggleTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_toggle_favorites()
    {
        $household = Household::factory()->create();

        $this->post(route('favorites.toggle'), ['favoritable_type' => 'household', 'favoritable_id' => $household->id])
            ->assertRedirect('/login');
    }

    public function test_toggling_adds_then_removes_a_household_favorite()
    {
        $user = User::factory()->create();
        $household = Household::factory()->create();

        $this->actingAs($user)->post(route('favorites.toggle'), [
            'favoritable_type' => 'household',
            'favoritable_id' => $household->id,
        ]);
        $this->assertSame(1, Favorite::count());

        $this->actingAs($user)->post(route('favorites.toggle'), [
            'favoritable_type' => 'household',
            'favoritable_id' => $household->id,
        ]);
        $this->assertSame(0, Favorite::count());
    }

    public function test_can_toggle_a_product_favorite()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create();

        $this->actingAs($user)->post(route('favorites.toggle'), [
            'favoritable_type' => 'product',
            'favoritable_id' => $product->id,
        ]);

        $this->assertDatabaseHas('favorites', [
            'user_id' => $user->id,
            'favoritable_type' => 'product',
            'favoritable_id' => $product->id,
        ]);
    }
}
