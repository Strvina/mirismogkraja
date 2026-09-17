<?php

namespace Tests\Feature;

use App\Models\Household;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderStatusTest extends TestCase
{
    use RefreshDatabase;

    private function orderFor(User $buyer, User $seller): Order
    {
        $household = Household::factory()->for($seller)->create();
        $order = Order::factory()->for($buyer)->create(['status' => 'pending']);
        $order->items()->create([
            'product_id' => Product::factory()->for($household)->create()->id,
            'household_id' => $household->id,
            'product_name' => 'x',
            'unit_price' => 1,
            'quantity' => 1,
            'subtotal' => 1,
        ]);

        return $order;
    }

    public function test_seller_can_advance_order_status()
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $order = $this->orderFor($buyer, $seller);

        $this->actingAs($seller)->patch(route('orders.status', $order), ['status' => 'confirmed']);

        $this->assertSame('confirmed', $order->fresh()->status);
    }

    public function test_buyer_cannot_change_order_status()
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $order = $this->orderFor($buyer, $seller);

        $this->actingAs($buyer)->patch(route('orders.status', $order), ['status' => 'confirmed'])->assertForbidden();
    }

    public function test_invalid_transition_is_rejected()
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $order = $this->orderFor($buyer, $seller);

        $this->actingAs($seller)->patch(route('orders.status', $order), ['status' => 'delivered'])
            ->assertSessionHasErrors('status');

        $this->assertSame('pending', $order->fresh()->status);
    }

    public function test_cannot_change_status_of_a_delivered_order()
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $order = $this->orderFor($buyer, $seller);
        $order->update(['status' => 'delivered']);

        $this->actingAs($seller)->patch(route('orders.status', $order), ['status' => 'cancelled'])
            ->assertSessionHasErrors('status');
    }
}
