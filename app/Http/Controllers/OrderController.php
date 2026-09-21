<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
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
            'updatableItemIds' => $order->items
                ->filter(fn (OrderItem $item) => request()->user()->can('updateStatus', $item))
                ->pluck('id')
                ->values(),
        ]);
    }

    public function updateStatus(Request $request, Order $order, OrderItem $item, OrderStatusService $orders): RedirectResponse
    {
        abort_unless($item->order_id === $order->id, 404);
        $this->authorize('updateStatus', $item);

        $data = $request->validate([
            'status' => ['required', Rule::in(OrderStatusService::STATUSES)],
        ]);

        $orders->transitionTo($item, $data['status']);

        return back();
    }
}
