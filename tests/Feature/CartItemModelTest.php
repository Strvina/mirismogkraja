<?php

namespace Tests\Feature;

use App\Models\CartItem;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartItemModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_cart_item_belongs_to_user_and_product()
    {
        $item = CartItem::factory()->create();

        $this->assertNotNull($item->user);
        $this->assertNotNull($item->product);
    }

    public function test_a_user_cannot_have_two_cart_items_for_the_same_product()
    {
        $user = User::factory()->create();
        $item = CartItem::factory()->for($user)->create();

        $this->expectException(QueryException::class);
        CartItem::factory()->for($user)->create(['product_id' => $item->product_id]);
    }
}
