<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_belongs_to_a_user_and_has_many_items()
    {
        $user = User::factory()->create();
        $order = Order::factory()->for($user)->create();
        OrderItem::factory()->for($order)->count(2)->create();

        $this->assertTrue($order->user->is($user));
        $this->assertCount(2, $order->items);
    }

    public function test_order_item_snapshots_product_name_and_price()
    {
        $item = OrderItem::factory()->create(['product_name' => 'Domaći ajvar', 'unit_price' => 450]);

        $this->assertSame('Domaći ajvar', $item->product_name);
        $this->assertSame('450.00', (string) $item->unit_price);
    }

    public function test_order_item_survives_product_deletion()
    {
        $item = OrderItem::factory()->create();
        $item->product->delete();

        $this->assertDatabaseHas('order_items', ['id' => $item->id, 'product_id' => null]);
    }
}
