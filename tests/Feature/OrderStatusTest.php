<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderStatusTest extends TestCase
{
    use RefreshDatabase;

    private function orderFor(User $buyer, User $seller): Order
    {
        $producer = Producer::factory()->for($seller)->create();
        $order = Order::factory()->for($buyer)->create(['status' => 'pending']);
        $order->items()->create([
            'product_id' => Product::factory()->for($producer)->create()->id,
            'household_id' => $producer->id,
            'product_name' => 'x',
            'unit_price' => 1,
            'quantity' => 1,
            'subtotal' => 1,
        ]);

        return $order;
    }

    public function test_producer_can_advance_the_inquiry_status()
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $order = $this->orderFor($buyer, $seller);

        $this->actingAs($seller)->patch(route('orders.status', $order), ['status' => 'contacted']);

        $this->assertSame('contacted', $order->fresh()->status);
    }

    public function test_buyer_cannot_change_the_inquiry_status()
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $order = $this->orderFor($buyer, $seller);

        $this->actingAs($buyer)->patch(route('orders.status', $order), ['status' => 'contacted'])->assertForbidden();
    }

    public function test_invalid_transition_is_rejected()
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $order = $this->orderFor($buyer, $seller);

        $this->actingAs($seller)->patch(route('orders.status', $order), ['status' => 'fulfilled'])
            ->assertSessionHasErrors('status');

        $this->assertSame('pending', $order->fresh()->status);
    }

    public function test_cannot_change_the_status_of_a_settled_inquiry()
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $order = $this->orderFor($buyer, $seller);
        $order->update(['status' => 'fulfilled']);

        $this->actingAs($seller)->patch(route('orders.status', $order), ['status' => 'cancelled'])
            ->assertSessionHasErrors('status');
    }
}
