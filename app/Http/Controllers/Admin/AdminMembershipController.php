<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProducerSubscription;
use App\Models\SubscriptionPlan;
use App\Services\SubscriptionService;
use App\Support\Settings;
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
    public function __construct(private readonly Settings $settings) {}

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
            // Printed on every slip, so the owner edits it here rather
            // than in a deployment file.
            'payment' => collect(['recipient', 'address', 'account', 'purpose', 'model', 'code'])
                ->mapWithKeys(fn (string $key) => [
                    $key => $this->settings->get('payment.'.$key, (string) config('platform.payment.'.$key)),
                ])
                ->all(),
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

    /**
     * The bank details every slip is printed with. Stored as settings, not
     * as .env values: they are not secret, they are not per-environment, and
     * changing them should not be a deploy.
     */
    public function updatePayment(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'recipient' => ['required', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:160'],
            // Written the way a bank writes it, which is what is printed and
            // what the QR payload is built from.
            'account' => ['required', 'string', 'regex:/^\\d{3}-\\d{1,13}-\\d{2}$/'],
            'purpose' => ['required', 'string', 'max:120'],
            'model' => ['required', 'string', 'max:2'],
            'code' => ['required', 'string', 'max:3'],
        ]);

        $this->settings->put(
            collect($data)->mapWithKeys(fn (?string $value, string $key) => ['payment.'.$key => $value])->all()
        );

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
