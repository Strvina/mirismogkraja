<?php

namespace App\Services;

use App\Models\CartItem;
use App\Models\Product;
use App\Models\User;

class CartService
{
    /**
     * Add a product to the user's cart, or increase its quantity if it's already there.
     */
    public function add(User $user, Product $product, int $quantity): CartItem
    {
        $item = $user->cartItems()->firstOrNew(['product_id' => $product->id]);
        $item->quantity = ($item->exists ? $item->quantity : 0) + $quantity;
        $item->save();

        return $item;
    }

    public function updateQuantity(CartItem $item, int $quantity): CartItem
    {
        $item->update(['quantity' => $quantity]);

        return $item;
    }
}
