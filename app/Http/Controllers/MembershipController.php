<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\ProducerSubscription;
use App\Models\SubscriptionPlan;
use App\Services\PaymentSlipService;
use App\Services\SubscriptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The producer's own membership page (task 20.1): which plan they are on,
 * what the others offer, and - once they pick one - the details to write on
 * the payment slip.
 */
class MembershipController extends Controller
{
    public function index(Request $request, SubscriptionService $subscriptions, PaymentSlipService $slips): Response
    {
        $producers = $request->user()->producers()->with(['subscriptions' => fn ($query) => $query->latest()->with('plan')])->get();

        return Inertia::render('memberships/index', [
            'plans' => SubscriptionPlan::where('is_active', true)->orderBy('level')->get(),
            'featureLabels' => SubscriptionPlan::FEATURES,
            'producers' => $producers->map(fn (Producer $producer) => [
                'id' => $producer->id,
                'name' => $producer->name,
                'status' => $producer->status,
                'current_plan' => $subscriptions->planFor($producer)?->only(['id', 'name', 'level']),
                'active' => $producer->subscriptions->first(fn (ProducerSubscription $subscription) => $subscription->isActive())
                    ?->only(['id', 'ends_at']),
                'pending' => $this->pendingSlip($producer, $slips),
            ]),
        ]);
    }

    /**
     * The whole slip, not just its reference: everything the producer copies
     * onto paper and everything a banking app scans is built in one place,
     * so the two cannot disagree.
     *
     * @return array<string, mixed>|null
     */
    private function pendingSlip(Producer $producer, PaymentSlipService $slips): ?array
    {
        $pending = $producer->subscriptions->first(
            fn (ProducerSubscription $subscription) => $subscription->status === ProducerSubscription::STATUS_PENDING
        );

        if (! $pending) {
            return null;
        }

        // Already loaded on the producer, so handing it over saves the slip
        // a query for each one.
        $pending->setRelation('producer', $producer);

        return [
            'id' => $pending->id,
            'created_at' => $pending->created_at,
            'plan' => $pending->plan?->name,
            'slip' => $slips->detailsFor($pending),
        ];
    }

    /**
     * Ask for a plan. This creates nothing to pay with online - it hands
     * back a reference number for the slip and waits for an admin.
     */
    public function store(Request $request, SubscriptionService $subscriptions): RedirectResponse
    {
        $data = $request->validate([
            'producer_id' => ['required', 'integer'],
            'plan_id' => ['required', 'exists:subscription_plans,id'],
        ]);

        $producer = Producer::findOrFail($data['producer_id']);
        $this->authorize('update', $producer);

        $plan = SubscriptionPlan::where('is_active', true)->findOrFail($data['plan_id']);

        $subscriptions->request($producer, $plan);

        return back()->with('status', 'Zabeležili smo izbor paketa. Uplatite iznos i mi ćemo aktivirati članarinu.');
    }
}
