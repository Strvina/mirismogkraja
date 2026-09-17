<?php

namespace App\Http\Controllers;

use App\Models\CartItem;
use App\Models\Product;
use App\Services\CartService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CartController extends Controller
{
    /**
     * Show the authenticated user's cart, grouped by household.
     */
    public function index(Request $request): Response
    {
        $items = $request->user()->cartItems()->with(['product.household', 'product.images'])->get();

        $groups = $items->groupBy(fn (CartItem $item) => $item->product->household_id)
            ->map(fn ($items) => [
                'household' => $items->first()->product->household,
                'items' => $items->values(),
            ])
            ->values();

        return Inertia::render('cart/index', ['groups' => $groups]);
    }

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
