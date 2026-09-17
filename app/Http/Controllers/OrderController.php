<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\OrderStatusService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function show(Order $order): Response
    {
        $this->authorize('view', $order);

        return Inertia::render('orders/show', [
            'order' => $order->load('items'),
            'canUpdateStatus' => request()->user()->can('updateStatus', $order),
        ]);
    }

    public function updateStatus(Request $request, Order $order, OrderStatusService $orders): RedirectResponse
    {
        $this->authorize('updateStatus', $order);

        $data = $request->validate([
            'status' => ['required', 'in:pending,confirmed,shipped,delivered,cancelled'],
        ]);

        $orders->transitionTo($order, $data['status']);

        return back();
    }
}
