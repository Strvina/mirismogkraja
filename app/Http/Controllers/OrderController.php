<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\OrderStatusService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    /**
     * "Moje porudžbine": orders the authenticated user placed as a buyer.
     */
    public function myOrders(Request $request): Response
    {
        return Inertia::render('orders/my-orders', [
            'orders' => $request->user()->orders()->with('items')->latest()->get(),
        ]);
    }

    /**
     * "Porudžbine mog domaćinstva": orders containing at least one item
     * fulfilled by a producer the authenticated user owns. Only that
     * seller's own items within each order are included.
     */
    public function producerOrders(Request $request): Response
    {
        $producerIds = $request->user()->producers()->pluck('id');

        $orders = Order::whereHas('items', fn ($query) => $query->whereIn('household_id', $producerIds))
            ->with(['user', 'items' => fn ($query) => $query->whereIn('household_id', $producerIds)])
            ->latest()
            ->get();

        return Inertia::render('orders/producer-orders', ['orders' => $orders]);
    }

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
            'status' => ['required', Rule::in(OrderStatusService::STATUSES)],
        ]);

        $orders->transitionTo($order, $data['status']);

        return back();
    }
}
