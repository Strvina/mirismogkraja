<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Referral;
use App\Services\ReferralService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Who referred whom, and what each referral came to. Read-only: a referral
 * is settled by approving the referred producer, with this list as the
 * place to notice a producer whose "new" producers all look alike.
 */
class ReferralController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();
        $known = array_key_exists($status, Referral::STATUS_LABELS);

        return Inertia::render('admin/referrals/index', [
            'referrals' => Referral::query()
                ->with(['referrer:id,name,slug', 'referredUser:id,name,email', 'referredProducer:id,name,slug,status'])
                ->when($known, fn ($query) => $query->where('status', $status))
                ->latest()
                ->paginate(30)
                ->withQueryString()
                ->through(fn (Referral $referral) => [
                    'id' => $referral->id,
                    'status' => $referral->status,
                    'status_label' => __(Referral::STATUS_LABELS[$referral->status] ?? $referral->status),
                    'created_at' => $referral->created_at,
                    'rewarded_at' => $referral->rewarded_at,
                    'referrer' => $referral->referrer?->only(['id', 'name', 'slug']),
                    'user' => $referral->referredUser?->only(['id', 'name', 'email']),
                    'producer' => $referral->referredProducer?->only(['id', 'name', 'slug', 'status']),
                ]),
            'statuses' => array_map(__(...), Referral::STATUS_LABELS),
            'filters' => ['status' => $known ? $status : null],
            'rules' => ['rewardDays' => ReferralService::REWARD_DAYS, 'maxPerYear' => ReferralService::MAX_REWARDS_PER_YEAR],
        ]);
    }
}
