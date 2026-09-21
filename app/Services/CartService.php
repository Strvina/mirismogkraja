<?php

namespace App\Services;

use App\Models\CartItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class CartService
{
    /**
     * Add a product to the user's cart, or increase its quantity if it's already there.
     */
    public function add(User $user, Product $product, int $quantity): CartItem
    {
        $this->ensureAvailable($product, $quantity + (int) ($user->cartItems()->where('product_id', $product->id)->value('quantity') ?? 0));
        $item = $user->cartItems()->firstOrNew(['product_id' => $product->id]);
        $item->quantity = ($item->exists ? $item->quantity : 0) + $quantity;
        $item->save();

        return $item;
    }

    public function updateQuantity(CartItem $item, int $quantity): CartItem
    {
        $this->ensureAvailable($item->product, $quantity);
        $item->update(['quantity' => $quantity]);

        return $item;
    }

    private function ensureAvailable(Product $product, int $quantity): void
    {
        if ($quantity > $product->stock_quantity) {
            throw ValidationException::withMessages(['quantity' => 'Tražena količina nije dostupna.']);
        }
    }
}
