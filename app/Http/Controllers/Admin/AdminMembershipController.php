<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProducerSubscription;
use App\Models\SubscriptionPlan;
use App\Services\SubscriptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Monetisation in the admin panel (task 20.9): the plans and their prices,
 * and the payments waiting to be confirmed.
 *
 * Confirming is a human step by design - the money arrives on a bank slip,
 * so somebody has to look at the statement and say it came.
 */
class AdminMembershipController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();

        if (! in_array($status, ProducerSubscription::STATUSES, true)) {
            $status = ProducerSubscription::STATUS_PENDING;
        }

        return Inertia::render('admin/memberships/index', [
            'plans' => SubscriptionPlan::orderBy('level')->get(),
            'featureLabels' => SubscriptionPlan::FEATURES,
            'subscriptions' => ProducerSubscription::with(['producer:id,name,slug', 'plan:id,name'])
                ->where('status', $status)
                ->latest()
                ->get(),
            'filters' => ['status' => $status],
            'counts' => collect(ProducerSubscription::STATUSES)
                ->mapWithKeys(fn (string $value) => [$value => ProducerSubscription::where('status', $value)->count()])
                ->all(),
            // What the platform has actually been paid, by plan. Only
            // confirmed money counts.
            'revenue' => ProducerSubscription::query()
                ->whereNotNull('confirmed_at')
                ->selectRaw('subscription_plan_id, count(*) as count, sum(amount_rsd) as total')
                ->groupBy('subscription_plan_id')
                ->with('plan:id,name')
                ->get()
                ->map(fn ($row) => [
                    'plan' => $row->plan?->name ?? '—',
                    'count' => (int) $row->count,
                    'total' => (int) $row->total,
                ]),
        ]);
    }

    public function confirm(Request $request, ProducerSubscription $subscription, SubscriptionService $subscriptions): RedirectResponse
    {
        abort_unless($subscription->status === ProducerSubscription::STATUS_PENDING, 422);

        $subscriptions->confirmPayment($subscription, $request->user()->id);

        return back();
    }

    public function cancel(ProducerSubscription $subscription): RedirectResponse
    {
        $subscription->update(['status' => ProducerSubscription::STATUS_CANCELLED]);

        return back();
    }

    public function updatePlan(Request $request, SubscriptionPlan $plan): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'price_rsd' => ['required', 'integer', 'min:0', 'max:1000000'],
            'duration_days' => ['required', 'integer', 'min:1', 'max:3650'],
            'is_active' => ['required', 'boolean'],
            'features' => ['nullable', 'array'],
            'features.*' => [Rule::in(array_keys(SubscriptionPlan::FEATURES))],
        ]);

        $plan->update($data);

        return back();
    }
}
