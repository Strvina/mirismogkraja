<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function show(Order $order): Response
    {
        $this->authorize('view', $order);

        return Inertia::render('orders/show', [
            'order' => $order->load('items'),
        ]);
    }
}
