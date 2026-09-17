<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    /**
     * Turn the user's cart into a single Order, with OrderItems snapshotting
     * each product's name/price at purchase time (task 4.6) - so a later
     * price change never rewrites history. Cart is emptied afterwards.
     */
    public function checkout(User $user, string $shippingAddress): Order
    {
        $cartItems = $user->cartItems()->with('product')->get();

        if ($cartItems->isEmpty()) {
            throw ValidationException::withMessages(['cart' => 'Korpa je prazna.']);
        }

        return DB::transaction(function () use ($user, $shippingAddress, $cartItems) {
            $order = $user->orders()->create([
                'status' => 'pending',
                'total_price' => $cartItems->sum(fn ($item) => $item->product->price * $item->quantity),
                'shipping_address' => $shippingAddress,
            ]);

            foreach ($cartItems as $item) {
                $order->items()->create([
                    'product_id' => $item->product_id,
                    'household_id' => $item->product->household_id,
                    'product_name' => $item->product->name,
                    'unit_price' => $item->product->price,
                    'quantity' => $item->quantity,
                    'subtotal' => $item->product->price * $item->quantity,
                ]);
            }

            $user->cartItems()->delete();

            return $order;
        });
    }
}
