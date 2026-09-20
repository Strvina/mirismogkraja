<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class InquiryReportController extends Controller
{
    /**
     * Aggregate view of inquiries (task 14, point 5). Every figure here comes
     * from what producers reported about their own inquiries - the platform
     * takes no part in payment or delivery and can't verify any of it, so
     * this is orientation, not accounting. The UI says so too.
     */
    public function index(): Response
    {
        $byStatus = Order::query()
            ->select('status', DB::raw('COUNT(*) as count'), DB::raw('SUM(total_price) as value'))
            ->groupBy('status')
            ->get()
            ->mapWithKeys(fn ($row) => [$row->status => [
                'count' => (int) $row->count,
                'value' => (float) $row->value,
            ]]);

        $thisMonth = OrderItem::query()
            ->whereHas('order', fn ($query) => $query
                ->where('status', 'fulfilled')
                ->where('created_at', '>=', now()->startOfMonth()))
            ->select('product_name', DB::raw('SUM(quantity) as quantity'), DB::raw('SUM(subtotal) as value'))
            ->groupBy('product_name')
            ->orderByDesc('quantity')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'product_name' => $row->product_name,
                'quantity' => (int) $row->quantity,
                'value' => (float) $row->value,
            ]);

        $byProducer = OrderItem::query()
            ->whereHas('order', fn ($query) => $query->where('status', 'fulfilled'))
            ->with('producer:id,name')
            ->select('household_id', DB::raw('COUNT(DISTINCT order_id) as inquiries'), DB::raw('SUM(subtotal) as value'))
            ->groupBy('household_id')
            ->orderByDesc('value')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'producer' => $row->producer?->name ?? 'Obrisan proizvođač',
                'inquiries' => (int) $row->inquiries,
                'value' => (float) $row->value,
            ]);

        return Inertia::render('admin/inquiries/index', [
            'byStatus' => $byStatus,
            'topProductsThisMonth' => $thisMonth,
            'topProducers' => $byProducer,
        ]);
    }
}
