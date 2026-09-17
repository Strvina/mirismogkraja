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
            'cartItems' => $request->user()->cartItems()->with('product')->get(),
        ]);
    }

    public function store(Request $request, CheckoutService $checkout): RedirectResponse
    {
        $data = $request->validate(['shipping_address' => ['required', 'string', 'max:255']]);

        $order = $checkout->checkout($request->user(), $data['shipping_address']);

        return to_route('orders.show', $order);
    }
}
