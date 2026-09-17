<?php

namespace Tests\Feature;

use App\Models\Household;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderListsTest extends TestCase
{
    use RefreshDatabase;

    public function test_my_orders_only_shows_own_orders()
    {
        $user = User::factory()->create();
        Order::factory()->for($user)->create();
        Order::factory()->create(); // someone else's

        $response = $this->actingAs($user)->get(route('orders.mine'));

        $response->assertInertia(fn ($page) => $page->has('orders', 1));
    }

    public function test_household_orders_only_shows_orders_touching_own_households()
    {
        $seller = User::factory()->create();
        $otherSeller = User::factory()->create();
        $household = Household::factory()->for($seller)->create();
        $otherHousehold = Household::factory()->for($otherSeller)->create();

        $orderA = Order::factory()->create();
        $orderA->items()->create([
            'product_id' => Product::factory()->for($household)->create()->id,
            'household_id' => $household->id,
            'product_name' => 'x', 'unit_price' => 1, 'quantity' => 1, 'subtotal' => 1,
        ]);

        $orderB = Order::factory()->create();
        $orderB->items()->create([
            'product_id' => Product::factory()->for($otherHousehold)->create()->id,
            'household_id' => $otherHousehold->id,
            'product_name' => 'y', 'unit_price' => 1, 'quantity' => 1, 'subtotal' => 1,
        ]);

        $response = $this->actingAs($seller)->get(route('orders.household'));

        $response->assertInertia(fn ($page) => $page->has('orders', 1)
            ->where('orders.0.id', $orderA->id));
    }
}
