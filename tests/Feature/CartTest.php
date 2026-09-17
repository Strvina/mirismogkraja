<?php

namespace Tests\Feature;

use App\Models\CartItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_add_to_cart()
    {
        $product = Product::factory()->create();

        $this->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 1])
            ->assertRedirect('/login');
    }

    public function test_adding_a_product_creates_a_cart_item()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create();

        $this->actingAs($user)->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 2]);

        $this->assertDatabaseHas('cart_items', ['user_id' => $user->id, 'product_id' => $product->id, 'quantity' => 2]);
    }

    public function test_adding_the_same_product_twice_increases_quantity_instead_of_duplicating()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create();

        $this->actingAs($user)->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 2]);
        $this->actingAs($user)->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 3]);

        $this->assertSame(1, CartItem::count());
        $this->assertSame(5, CartItem::sole()->quantity);
    }

    public function test_owner_can_update_quantity()
    {
        $user = User::factory()->create();
        $item = CartItem::factory()->for($user)->create(['quantity' => 1]);

        $this->actingAs($user)->patch(route('cart.update', $item), ['quantity' => 4]);

        $this->assertSame(4, $item->fresh()->quantity);
    }

    public function test_user_cannot_update_someone_elses_cart_item()
    {
        $user = User::factory()->create();
        $item = CartItem::factory()->create(); // someone else's

        $this->actingAs($user)->patch(route('cart.update', $item), ['quantity' => 4])->assertForbidden();
    }

    public function test_owner_can_remove_a_cart_item()
    {
        $user = User::factory()->create();
        $item = CartItem::factory()->for($user)->create();

        $this->actingAs($user)->delete(route('cart.destroy', $item));

        $this->assertDatabaseMissing('cart_items', ['id' => $item->id]);
    }

    public function test_user_cannot_remove_someone_elses_cart_item()
    {
        $user = User::factory()->create();
        $item = CartItem::factory()->create();

        $this->actingAs($user)->delete(route('cart.destroy', $item))->assertForbidden();
        $this->assertDatabaseHas('cart_items', ['id' => $item->id]);
    }
}
