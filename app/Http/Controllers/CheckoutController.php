<?php

namespace App\Http\Controllers;

use App\Services\CheckoutService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CheckoutController extends Controller
{
    public function create(Request $request): Response
    {
        return Inertia::render('checkout/create', [
            'cartItems' => $request->user()->cartItems()->with('product.producer:id,name')->get(),
            'contact' => $request->user()->only(['name', 'email', 'phone']),
        ]);
    }

    public function store(Request $request, CheckoutService $checkout): RedirectResponse
    {
        $data = $request->validate([
            'shipping_address' => ['required', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $order = $checkout->checkout($request->user(), $data['shipping_address'], $data['note'] ?? null);

        return to_route('orders.show', $order);
    }
}
