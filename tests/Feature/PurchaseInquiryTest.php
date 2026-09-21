<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\User;
use App\Services\CartService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseInquiryTest extends TestCase
{
    use RefreshDatabase;

    public function test_sending_an_inquiry_messages_every_producer_involved(): void
    {
        $buyer = User::factory()->create(['name' => 'Marko', 'phone' => '+381 60 111 2222']);
        $first = Producer::factory()->active()->create();
        $second = Producer::factory()->active()->create();

        $cart = new CartService;
        $cart->add($buyer, Product::factory()->for($first)->create(['name' => 'Ajvar', 'price' => 500]), 2);
        $cart->add($buyer, Product::factory()->for($second)->create(['name' => 'Med', 'price' => 900]), 1);

        $this->actingAs($buyer)->post(route('checkout.store'), [
            'shipping_address' => 'Bulevar oslobođenja 1, Leskovac',
            'note' => 'Može preuzimanje u subotu.',
        ])->assertRedirect();

        // One thread per producer, each carrying only their own items.
        $this->assertSame(1, ProducerMessage::thread($first, $buyer)->count());
        $this->assertSame(1, ProducerMessage::thread($second, $buyer)->count());

        $toFirst = ProducerMessage::thread($first, $buyer)->sole()->body;
        $this->assertStringContainsString('Ajvar', $toFirst);
        $this->assertStringNotContainsString('Med', $toFirst);
        $this->assertStringContainsString('Bulevar oslobođenja 1, Leskovac', $toFirst);
        $this->assertStringContainsString('+381 60 111 2222', $toFirst);
        $this->assertStringContainsString('Može preuzimanje u subotu.', $toFirst);
    }

    public function test_an_inquiry_starts_pending_and_empties_the_cart(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();

        (new CartService)->add($buyer, Product::factory()->for($producer)->create(['price' => 250, 'stock_quantity' => 4]), 4);

        $this->actingAs($buyer)->post(route('checkout.store'), ['shipping_address' => 'Neka adresa'])
            ->assertRedirect();

        $order = $buyer->orders()->sole();
        $this->assertSame('pending', $order->items()->sole()->status);
        $this->assertSame('1000.00', $order->total_price);
        $this->assertSame(0, $buyer->cartItems()->count());
    }

    public function test_the_producer_self_reports_the_status(): void
    {
        $buyer = User::factory()->create();
        $owner = User::factory()->create();
        $producer = Producer::factory()->for($owner)->active()->create();

        (new CartService)->add($buyer, Product::factory()->for($producer)->create(), 1);
        $this->actingAs($buyer)->post(route('checkout.store'), ['shipping_address' => 'Adresa']);

        $order = $buyer->orders()->sole();

        $item = $order->items()->sole();
        $this->actingAs($owner)->patch(route('orders.status', [$order, $item]), ['status' => 'contacted'])->assertRedirect();
        $this->actingAs($owner)->patch(route('orders.status', [$order, $item]), ['status' => 'fulfilled'])->assertRedirect();

        $this->assertSame('fulfilled', $item->refresh()->status);

        // Settled inquiries are terminal.
        $this->actingAs($owner)->patch(route('orders.status', [$order, $item]), ['status' => 'cancelled'])
            ->assertSessionHasErrors('status');
    }
}
