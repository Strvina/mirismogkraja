<?php

namespace App\Http\Controllers;

use App\Models\Boost;
use App\Models\Producer;
use App\Services\BoostService;
use App\Services\CancellationService;
use App\Services\PaymentSlipPdf;
use App\Services\PaymentSlipService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

/**
 * A producer's own boosts (task 20.2): what can be boosted, for how much,
 * what is running, and the slip for anything still unpaid.
 */
class BoostController extends Controller
{
    public function index(Request $request, BoostService $boosts, PaymentSlipService $slips): Response
    {
        $producers = $request->user()->producers()
            ->published()
            ->orderBy('name')
            ->with(['products' => fn ($query) => $query->where('status', 'active')->orderBy('name')->select(['id', 'household_id', 'name'])])
            ->get(['id', 'name']);

        $history = Boost::query()
            ->whereIn('household_id', $request->user()->producers()->select('id'))
            ->with(['boostable', 'producer.user'])
            ->latest()
            ->limit(30)
            ->get();

        return Inertia::render('boosts/index', [
            'terms' => $boosts->terms(),
            'producers' => $producers->map(fn (Producer $producer) => [
                'id' => $producer->id,
                'name' => $producer->name,
                'products' => $producer->products->map->only(['id', 'name'])->values(),
            ]),
            'boosts' => $history->map(fn (Boost $boost) => [
                'id' => $boost->id,
                'kind' => $boost->isProduct() ? 'product' : 'profile',
                'name' => $boost->boostable?->name ?? 'Obrisano',
                'status' => $boost->status,
                'amount_rsd' => $boost->amount_rsd,
                'days' => $boost->days,
                'ends_at' => $boost->ends_at,
                'created_at' => $boost->created_at,
                'cancel_requested_at' => $boost->cancel_requested_at,
                'refund' => CancellationService::refundState($boost),
                // Everything the producer needs to pay, for the unpaid ones.
                'slip' => $boost->status === Boost::STATUS_PENDING ? $slips->detailsFor($boost) : null,
                'download_url' => $boost->status === Boost::STATUS_PENDING ? route('boosts.slip', $boost) : null,
            ]),
        ]);
    }

    /**
     * Ask for a boost. Only something already public can be boosted - paying
     * to feature a page nobody can open would buy nothing.
     */
    public function store(Request $request, BoostService $boosts): RedirectResponse
    {
        $data = $request->validate([
            'kind' => ['required', 'in:profile,product'],
            'producer_id' => ['required', 'integer'],
            'product_id' => ['required_if:kind,product', 'nullable', 'integer'],
        ]);

        $producer = Producer::published()->findOrFail($data['producer_id']);
        $this->authorize('update', $producer);

        $target = $data['kind'] === 'product'
            ? $producer->products()->where('status', 'active')->findOrFail($data['product_id'])
            : $producer;

        $boosts->request($producer, $target);

        return back()->with('status', __('Isticanje je zabeleženo. Uplatite iznos i mi ćemo ga aktivirati.'));
    }

    public function slip(Boost $boost, PaymentSlipPdf $pdf): HttpResponse
    {
        $this->authorize('update', $boost->producer);

        return response($pdf->render($boost), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$pdf->filenameFor($boost).'"',
        ]);
    }
}
