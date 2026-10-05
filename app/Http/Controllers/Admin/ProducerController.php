<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProducerRequest;
use App\Models\Producer;
use App\Models\Referral;
use App\Notifications\SiteNotification;
use App\Services\FoundingProducerService;
use App\Services\ReferralService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProducerController extends Controller
{
    public function index(Request $request): Response
    {
        $producers = Producer::query()
            // The owner may have archived their account, and the listing still
            // has to say whose producer this was.
            ->with([
                'user' => fn ($query) => $query->withTrashed()->select('id', 'name', 'email'),
                // Which plan they pay for - Pro includes priority support,
                // so whoever answers them needs to see it.
                'currentMembership.plan:id,name,level',
            ])
            ->withCount('products')
            ->when($request->string('status')->toString(), fn ($query, $status) => $query->where('status', $status))
            // Applications waiting on a decision come first.
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
            ->latest()
            ->paginate(25)
            ->withQueryString();

        // Who referred the producers still waiting, in one query for the
        // page: approving one of them gives both sides a month of Premium,
        // so the admin should see that before deciding.
        $referrers = Referral::query()
            ->where('status', Referral::STATUS_PENDING)
            ->whereIn('referred_user_id', $producers->getCollection()->where('status', 'pending')->pluck('user_id'))
            ->with('referrer:id,name')
            ->get()
            ->mapWithKeys(fn (Referral $referral) => [$referral->referred_user_id => $referral->referrer?->name]);

        $producers->getCollection()->each(fn (Producer $producer) => $producer->setAttribute(
            'referred_by',
            $producer->status === 'pending' ? $referrers->get($producer->user_id) : null,
        ));

        return Inertia::render('admin/producers/index', [
            'producers' => $producers,
            'pendingCount' => Producer::where('status', 'pending')->count(),
            'filters' => $request->only('status'),
        ]);
    }

    /**
     * Admin sets a producer's status directly (approve pending -> active,
     * or block/unblock) - bypasses ProducerPolicy's owner-only rules.
     */
    public function updateStatus(Request $request, Producer $producer, FoundingProducerService $founding, ReferralService $referrals): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', 'in:pending,active,blocked']]);

        $previous = $producer->status;
        $producer->update($data);

        // The founding producers are counted from approval, so a request that
        // is never approved does not use up a place.
        if ($producer->status === 'active') {
            $founding->claimNumberFor($producer);
        }

        // A producer who came through a referral link earns the month of
        // Premium for both sides here, at approval - the one step of a
        // referral that a person decides. Settled once per account, so
        // approving again after a block gives nothing more.
        if ($previous !== 'active' && $producer->status === 'active') {
            $referrals->settleFor($producer);
        }

        // Only on an actual change, so re-saving the same status doesn't
        // notify the owner again.
        if ($previous !== $producer->status && $producer->user) {
            $url = route('marketplace.producers.show', $producer->slug);

            if ($producer->status === 'active') {
                $producer->user->notify(SiteNotification::producerApproved($producer->name, $url));
            }

            if ($producer->status === 'blocked') {
                $producer->user->notify(SiteNotification::producerBlocked($producer->name, route('producers.index')));
            }
        }

        return back();
    }

    /**
     * Mark a producer as checked, or take that mark away. Done by
     * hand, after an admin has seen who they actually are - the badge is
     * only worth something if nothing awards it automatically.
     */
    public function updateVerification(Request $request, Producer $producer): RedirectResponse
    {
        $data = $request->validate(['verified' => ['required', 'boolean']]);

        $producer->update(['verified_at' => $data['verified'] ? now() : null]);

        if ($data['verified']) {
            $producer->user?->notify(SiteNotification::producerVerified(
                $producer->name,
                route('marketplace.producers.show', $producer->slug),
            ));
        }

        return back();
    }

    /**
     * Admins can correct a producer's details before or after approving them,
     * which the owner-only ProducerPolicy wouldn't allow.
     */
    public function update(Request $request, Producer $producer): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', StoreProducerRequest::PHONE_RULE],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'description' => ['nullable', 'string', 'max:'.StoreProducerRequest::DESCRIPTION_MAX],
        ]);

        $producer->update($data);

        return back();
    }
}
