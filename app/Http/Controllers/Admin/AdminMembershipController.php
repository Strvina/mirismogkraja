<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProducerSubscription;
use App\Models\SubscriptionPlan;
use App\Services\CancellationService;
use App\Services\FoundingProducerService;
use App\Services\SubscriptionService;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Memberships in the admin panel (task 20.9): on the settings tab, the plans,
 * the bank details printed on every slip and the founding places; on the
 * others, the payments by status.
 *
 * Confirming is a human step by design - the money arrives on a bank slip,
 * so somebody has to look at the statement and say it came.
 */
class AdminMembershipController extends Controller
{
    private const PAYMENT_FIELDS = ['recipient', 'address', 'account', 'purpose', 'model', 'code'];

    public function __construct(private readonly Settings $settings) {}

    public function index(Request $request, CancellationService $cancellations, FoundingProducerService $founding): Response
    {
        $status = $request->string('status')->toString();

        if ($status !== 'settings' && ! in_array($status, ProducerSubscription::STATUSES, true)) {
            $status = ProducerSubscription::STATUS_PENDING;
        }

        return Inertia::render('admin/memberships/index', [
            'filters' => ['status' => $status],
            'counts' => ProducerSubscription::countsByStatus(),
            // Only the open tab's data is loaded: the list, or the settings.
            'settings' => $status === 'settings' ? [
                'plans' => SubscriptionPlan::orderBy('level')->get(),
                'featureLabels' => array_map(__(...), SubscriptionPlan::FEATURES),
                'payment' => collect(self::PAYMENT_FIELDS)
                    ->mapWithKeys(fn (string $key) => [$key => $this->settings->get('payment.'.$key, (string) config('platform.payment.'.$key))])
                    ->all(),
                'founding' => ['limit' => $founding->limit(), 'claimed' => $founding->claimed()],
            ] : null,
            'subscriptions' => $status === 'settings' ? null : ProducerSubscription::with(['producer:id,name,slug', 'plan:id,name'])
                ->where('status', $status)
                ->latest()
                ->paginate(30)
                ->withQueryString()
                ->through(fn (ProducerSubscription $subscription) => [
                    'id' => $subscription->id,
                    'status' => $subscription->status,
                    'reference' => $subscription->reference,
                    'amount_rsd' => $subscription->amount_rsd,
                    'ends_at' => $subscription->ends_at,
                    'created_at' => $subscription->created_at,
                    'producer' => $subscription->producer?->only(['id', 'name', 'slug']),
                    'plan' => $subscription->plan?->only(['id', 'name']),
                    ...$cancellations->adminFields($subscription),
                ]),
        ]);
    }

    public function confirm(Request $request, ProducerSubscription $subscription, SubscriptionService $subscriptions): RedirectResponse
    {
        abort_unless($subscription->status === ProducerSubscription::STATUS_PENDING, 422);

        $subscriptions->confirmPayment($subscription, $request->user()->id);

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

    /**
     * How many founding places there are. Never fewer than already given
     * out: a number, once handed to a producer, is theirs for good.
     */
    public function updateFounding(Request $request, FoundingProducerService $founding): RedirectResponse
    {
        $data = $request->validate([
            'limit' => ['required', 'integer', 'min:'.$founding->claimed(), 'max:1000'],
        ], [
            'limit.min' => __('Već je dodeljeno :count mesta - broj ne može biti manji.', ['count' => $founding->claimed()]),
        ]);

        $this->settings->put(['founding.limit' => (string) $data['limit']]);

        return back();
    }
}
