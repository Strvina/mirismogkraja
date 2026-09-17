<?php

namespace Tests\Feature;

use App\Models\CartItem;
use App\Models\Household;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login()
    {
        $this->get(route('cart.index'))->assertRedirect('/login');
    }

    public function test_cart_items_are_grouped_by_household()
    {
        $user = User::factory()->create();
        $householdA = Household::factory()->create();
        $householdB = Household::factory()->create();

        CartItem::factory()->for($user)->create(['product_id' => Product::factory()->for($householdA)->create()->id]);
        CartItem::factory()->for($user)->create(['product_id' => Product::factory()->for($householdA)->create()->id]);
        CartItem::factory()->for($user)->create(['product_id' => Product::factory()->for($householdB)->create()->id]);

        $response = $this->actingAs($user)->get(route('cart.index'));

        $response->assertInertia(fn ($page) => $page->has('groups', 2));
    }
}
