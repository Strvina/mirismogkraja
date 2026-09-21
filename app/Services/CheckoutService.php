<?php

namespace App\Services;

use App\Models\CartItem;
use App\Models\Order;
use App\Models\ProducerMessage;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    /**
     * Turn the user's cart into a purchase inquiry (task 17). The platform
     * doesn't take payment or arrange delivery - it hands the producer the
     * buyer's request and contact details, and the two settle the rest
     * between themselves.
     *
     * Items snapshot each product's name/price, so a later price change
     * never rewrites what was asked for. The cart is emptied afterwards.
     */
    public function checkout(User $user, string $shippingAddress, ?string $note = null): Order
    {
        return DB::transaction(function () use ($user, $shippingAddress, $note) {
            $cartItems = $user->cartItems()->lockForUpdate()->with('product.producer')->get();

            if ($cartItems->isEmpty()) {
                throw ValidationException::withMessages(['cart' => 'Korpa je prazna.']);
            }

            foreach ($cartItems as $item) {
                if ($item->product->status !== 'active' || $item->product->producer->status !== 'active') {
                    throw ValidationException::withMessages(['cart' => "Proizvod '{$item->product->name}' više nije dostupan."]);
                }

                if ($item->quantity > $item->product->stock_quantity) {
                    throw ValidationException::withMessages(['cart' => "Nema dovoljno proizvoda: {$item->product->name}."]);
                }
            }
            $order = $user->orders()->create([
                'status' => 'pending',
                'total_price' => $cartItems->sum(fn ($item) => $item->product->price * $item->quantity),
                'shipping_address' => $shippingAddress,
                'note' => $note,
            ]);

            foreach ($cartItems as $item) {
                $order->items()->create([
                    'product_id' => $item->product_id,
                    'household_id' => $item->product->household_id,
                    'product_name' => $item->product->name,
                    'unit_price' => $item->product->price,
                    'quantity' => $item->quantity,
                    'subtotal' => $item->product->price * $item->quantity,
                    'status' => 'pending',
                ]);
            }

            $this->notifyProducers($user, $order, $cartItems, $shippingAddress, $note);

            $user->cartItems()->delete();

            return $order;
        });
    }

    /**
     * Drop the inquiry into each involved producer's message thread with
     * this buyer, so it lands where they already read buyer messages.
     *
     * @param  Collection<int, CartItem>  $cartItems
     */
    private function notifyProducers(User $user, Order $order, $cartItems, string $shippingAddress, ?string $note): void
    {
        foreach ($cartItems->groupBy('product.household_id') as $producerId => $items) {
            $lines = $items->map(fn ($item) => "• {$item->product->name} × {$item->quantity} {$item->product->unit}")->join("\n");

            $body = "Novi upit za kupovinu (#{$order->id})\n\n{$lines}\n\nAdresa: {$shippingAddress}";

            if ($user->phone) {
                $body .= "\nTelefon: {$user->phone}";
            }

            $body .= "\nEmail: {$user->email}";

            if ($note) {
                $body .= "\n\nNapomena kupca: {$note}";
            }

            ProducerMessage::create([
                'household_id' => $producerId,
                'buyer_id' => $user->id,
                'sender_id' => $user->id,
                'body' => $body,
            ]);
        }
    }
}
