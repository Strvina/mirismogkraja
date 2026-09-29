<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProducerSubscription;
use App\Models\SubscriptionPlan;
use App\Notifications\SiteNotification;
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

        // The list only: plans, prices and the slip's bank details have a
        // page of their own (admin.billing), so no status tab loads them.
        return Inertia::render('admin/memberships/index', [
            'subscriptions' => ProducerSubscription::with(['producer:id,name,slug', 'plan:id,name'])
                ->where('status', $status)
                // A request to cancel is the thing to act on, so it leads.
                ->orderByRaw('cancel_requested_at is null')
                ->latest()
                ->paginate(30)
                ->withQueryString(),
            'filters' => ['status' => $status],
            'counts' => ProducerSubscription::countsByStatus(),
        ]);
    }

    public function confirm(Request $request, ProducerSubscription $subscription, SubscriptionService $subscriptions): RedirectResponse
    {
        abort_unless($subscription->status === ProducerSubscription::STATUS_PENDING, 422);

        $subscriptions->confirmPayment($subscription, $request->user()->id);

        return back();
    }

    /**
     * Cancel an unpaid request, or deactivate a running membership - at the
     * producer's request or otherwise. The producer is told when something
     * they had was taken away; a refund, if any, is agreed off the site.
     */
    public function cancel(ProducerSubscription $subscription): RedirectResponse
    {
        $wasActive = $subscription->status === ProducerSubscription::STATUS_ACTIVE;

        $subscription->update(['status' => ProducerSubscription::STATUS_CANCELLED]);

        if ($wasActive) {
            $subscription->loadMissing(['plan', 'producer.user']);
            $subscription->producer?->user?->notify(SiteNotification::membershipCancelled($subscription->plan?->name ?? '', route('memberships.index')));
        }

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
