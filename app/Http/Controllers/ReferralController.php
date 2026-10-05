<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\Referral;
use App\Services\ReferralService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** "Preporuči proizvođača": the producer's link, and what came of it. */
class ReferralController extends Controller
{
    /** A list of who signed up; long enough for any honest use of the link. */
    private const SHOWN = 50;

    public function index(Producer $producer, ReferralService $referrals): Response
    {
        $this->authorize('update', $producer);

        // The link leads to the producer's name, so it exists once the
        // public can see them.
        $active = $producer->status === 'active';

        return Inertia::render('producers/referrals', [
            'producer' => $producer->only(['id', 'name', 'status']),
            'link' => $active ? $referrals->linkFor($producer) : null,
            'referrals' => Referral::query()
                ->where('referrer_producer_id', $producer->id)
                ->with('referredProducer:id,name,slug,status')
                ->latest()
                ->limit(self::SHOWN)
                ->get()
                // The new producer's name once they have one; never the
                // account's name or e-mail.
                ->map(fn (Referral $referral) => [
                    'id' => $referral->id,
                    'producer' => $referral->referredProducer?->name,
                    'status' => $referral->status,
                    'status_label' => __(Referral::STATUS_LABELS[$referral->status] ?? $referral->status),
                    'created_at' => $referral->created_at,
                    'rewarded_at' => $referral->rewarded_at,
                ]),
            'rules' => [
                'rewardDays' => ReferralService::REWARD_DAYS,
                'maxPerYear' => ReferralService::MAX_REWARDS_PER_YEAR,
                'windowDays' => ReferralService::REWARD_WINDOW_DAYS,
                'usedThisYear' => $referrals->rewardsThisYear($producer),
            ],
        ]);
    }

    /**
     * A referral link, opened. Leaves a note in the visitor's browser and
     * sends them to sign up; the referral itself is written only when an
     * account is actually created (see ReferralService::attach).
     */
    public function visit(Request $request, string $code, ReferralService $referrals): RedirectResponse
    {
        $referrer = $referrals->producerByCode($code);

        // Someone already signed in has an account, so there is nothing to
        // refer - they are shown the producer who sent them the link.
        if ($request->user() !== null) {
            return $referrer ? to_route('marketplace.producers.show', $referrer->slug) : to_route('home');
        }

        if ($referrer !== null) {
            $referrals->remember($referrer);
        }

        // An unknown code still lands somewhere useful, without saying so.
        return to_route('register');
    }
}
