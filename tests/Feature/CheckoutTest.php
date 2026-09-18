<?php

namespace Tests\Feature;

use App\Models\CartItem;
use App\Models\Order;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_creates_one_order_with_items_tagged_by_producer()
    {
        $user = User::factory()->create();
        $producerA = Producer::factory()->create();
        $producerB = Producer::factory()->create();
        $productA = Product::factory()->for($producerA)->create(['price' => 100]);
        $productB = Product::factory()->for($producerB)->create(['price' => 200]);
        CartItem::factory()->for($user)->create(['product_id' => $productA->id, 'quantity' => 2]);
        CartItem::factory()->for($user)->create(['product_id' => $productB->id, 'quantity' => 1]);

        $response = $this->actingAs($user)->post(route('checkout.store'), ['shipping_address' => 'Bulevar 1, Leskovac']);

        $order = Order::sole();
        $response->assertRedirect(route('orders.show', $order));
        $this->assertSame($user->id, $order->user_id);
        $this->assertSame('400.00', (string) $order->total_price);
        $this->assertCount(2, $order->items);
        $this->assertSame([$producerA->id, $producerB->id], $order->items->pluck('household_id')->sort()->values()->toArray());
    }

    public function test_checkout_snapshots_product_name_and_price()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['name' => 'Domaći ajvar', 'price' => 450]);
        CartItem::factory()->for($user)->create(['product_id' => $product->id, 'quantity' => 1]);

        $this->actingAs($user)->post(route('checkout.store'), ['shipping_address' => 'Adresa']);

        $item = Order::sole()->items->sole();
        $this->assertSame('Domaći ajvar', $item->product_name);
        $this->assertSame('450.00', (string) $item->unit_price);

        // Price changes later shouldn't rewrite the snapshot.
        $product->update(['price' => 999]);
        $this->assertSame('450.00', (string) $item->fresh()->unit_price);
    }

    public function test_checkout_empties_the_cart()
    {
        $user = User::factory()->create();
        CartItem::factory()->for($user)->create();

        $this->actingAs($user)->post(route('checkout.store'), ['shipping_address' => 'Adresa']);

        $this->assertSame(0, $user->cartItems()->count());
    }

    public function test_checkout_fails_with_an_empty_cart()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('checkout.store'), ['shipping_address' => 'Adresa'])
            ->assertSessionHasErrors('cart');

        $this->assertSame(0, Order::count());
    }

    public function test_only_buyer_or_fulfilling_seller_can_view_the_order()
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->create();
        $stranger = User::factory()->create();
        $producer = Producer::factory()->for($seller)->create();
        $order = Order::factory()->for($buyer)->create();
        $order->items()->create([
            'product_id' => Product::factory()->for($producer)->create()->id,
            'household_id' => $producer->id,
            'product_name' => 'x',
            'unit_price' => 1,
            'quantity' => 1,
            'subtotal' => 1,
        ]);

        $this->actingAs($buyer)->get(route('orders.show', $order))->assertOk();
        $this->actingAs($seller)->get(route('orders.show', $order))->assertOk();
        $this->actingAs($stranger)->get(route('orders.show', $order))->assertForbidden();
    }
}
