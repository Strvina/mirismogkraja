<?php

namespace App\Http\Controllers;

use App\Models\CartItem;
use App\Models\Product;
use App\Services\CartService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function store(Request $request, CartService $cart): RedirectResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $product = Product::findOrFail($data['product_id']);
        $cart->add($request->user(), $product, $data['quantity']);

        return back();
    }

    public function update(Request $request, CartItem $cartItem, CartService $cart): RedirectResponse
    {
        $this->authorize('update', $cartItem);

        $data = $request->validate(['quantity' => ['required', 'integer', 'min:1']]);
        $cart->updateQuantity($cartItem, $data['quantity']);

        return back();
    }

    public function destroy(CartItem $cartItem): RedirectResponse
    {
        $this->authorize('delete', $cartItem);

        $cartItem->delete();

        return back();
    }
}
