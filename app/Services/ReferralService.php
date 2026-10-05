<?php

namespace App\Services;

use App\Models\Producer;
use App\Models\Referral;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Notifications\SiteNotification;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * "Preporuči proizvođača".
 *
 * A producer shares a link; someone opens an account through it and
 * registers a producer of their own; when an admin approves that producer,
 * both get a month of Premium.
 *
 * The reward is real money's worth, so every step that could be faked is
 * tied to something that cannot:
 *
 *  - the referral is written when the account is created, so an existing
 *    account can never be "referred" after the fact;
 *  - an account is referred once, and earns for its referrer once - for its
 *    first approved producer (two unique indexes);
 *  - nothing is granted until an admin has approved the new producer, a
 *    decision a person makes with the referral in front of them;
 *  - two producers sharing a phone number or e-mail are one person;
 *  - a referrer earns at most MAX_REWARDS_PER_YEAR, and a sign-up counts
 *    for REWARD_WINDOW_DAYS.
 */
class ReferralService
{
    /** The cookie a referral link leaves until the visitor registers. */
    public const COOKIE = 'preporuka';

    private const COOKIE_DAYS = 30;

    public const REWARD_DAYS = 30;

    public const MAX_REWARDS_PER_YEAR = 12;

    public const REWARD_WINDOW_DAYS = 90;

    public function __construct(private readonly SubscriptionService $subscriptions) {}

    /** The producer's code, made the first time it is asked for. */
    public function codeFor(Producer $producer): string
    {
        if ($producer->referral_code !== null) {
            return $producer->referral_code;
        }

        return retry(5, function () use ($producer) {
            // Lowercase letters and digits: it is typed into nothing, only
            // clicked, but it should survive being read out or retyped.
            $producer->forceFill(['referral_code' => Str::lower(Str::random(8))])->save();

            return $producer->referral_code;
        }, 0, fn ($e) => $e instanceof UniqueConstraintViolationException);
    }

    public function linkFor(Producer $producer): string
    {
        return route('referrals.visit', $this->codeFor($producer));
    }

    /** The published producer a code belongs to, if any. */
    public function producerByCode(?string $code): ?Producer
    {
        if (! is_string($code) || ! preg_match('/^[a-z0-9]{8}$/', $code)) {
            return null;
        }

        return Producer::published()->where('referral_code', $code)->first();
    }

    /** Remember, in the visitor's browser, whose link brought them. */
    public function remember(Producer $referrer): void
    {
        Cookie::queue(self::COOKIE, $referrer->referral_code, self::COOKIE_DAYS * 24 * 60);
    }

    /** The producer whose link this visitor arrived through. */
    public function referrerFrom(Request $request): ?Producer
    {
        $code = $request->cookie(self::COOKIE);

        return $this->producerByCode(is_string($code) ? $code : null);
    }

    /**
     * Record the referral for an account that has just been created. Called
     * from every way of registering, and from nowhere else.
     */
    public function attach(User $newUser, Request $request): void
    {
        $referrer = $this->referrerFrom($request);

        Cookie::queue(Cookie::forget(self::COOKIE));

        // Their own link, opened to see what it does.
        if ($referrer === null || $referrer->user_id === $newUser->id) {
            return;
        }

        Referral::firstOrCreate(
            ['referred_user_id' => $newUser->id],
            ['referrer_producer_id' => $referrer->id, 'status' => Referral::STATUS_PENDING],
        );
    }

    /**
     * An admin has just approved this producer for the first time. If its
     * owner was referred, settle the referral: reward both, or record why
     * not. Returns the settled referral, or null when there was none.
     */
    public function settleFor(Producer $approved): ?Referral
    {
        $plan = SubscriptionPlan::where('slug', FoundingProducerService::PLAN)->first();

        // Nothing to give: the referral waits rather than being spent on nothing.
        if ($plan === null) {
            return null;
        }

        $referral = DB::transaction(function () use ($approved) {
            // Locked, so approving two of one owner's producers at the same
            // moment cannot settle the same referral twice.
            $referral = Referral::query()
                ->where('referred_user_id', $approved->user_id)
                ->where('status', Referral::STATUS_PENDING)
                ->lockForUpdate()
                ->first();

            if ($referral === null) {
                return null;
            }

            $referrer = Producer::find($referral->referrer_producer_id);
            $status = $this->verdict($referral, $referrer, $approved);

            $referral->update([
                'referred_producer_id' => $approved->id,
                'status' => $status,
                'rewarded_at' => $status === Referral::STATUS_REWARDED ? now() : null,
            ]);

            return $referral;
        });

        if ($referral?->status === Referral::STATUS_REWARDED) {
            $this->reward($referral, $approved, $plan);
        }

        return $referral;
    }

    /** Whether this referral earns its reward, and if not, why. */
    private function verdict(Referral $referral, ?Producer $referrer, Producer $approved): string
    {
        if ($referrer === null || $referrer->status !== 'active') {
            return Referral::STATUS_REFERRER_INACTIVE;
        }

        if ($referrer->user_id === $approved->user_id || $this->sameContact($referrer, $approved)) {
            return Referral::STATUS_SAME_PERSON;
        }

        if ($referral->created_at->lt(now()->subDays(self::REWARD_WINDOW_DAYS))) {
            return Referral::STATUS_EXPIRED;
        }

        if ($this->rewardsThisYear($referrer) >= self::MAX_REWARDS_PER_YEAR) {
            return Referral::STATUS_CAP_REACHED;
        }

        return Referral::STATUS_REWARDED;
    }

    public function rewardsThisYear(Producer $referrer): int
    {
        return Referral::query()
            ->where('referrer_producer_id', $referrer->id)
            ->where('rewarded_at', '>=', now()->subYear())
            ->count();
    }

    /**
     * The same phone number or contact e-mail on both producers, or on
     * their owners' accounts: one person referring themselves.
     */
    private function sameContact(Producer $referrer, Producer $approved): bool
    {
        $phones = fn (Producer $producer) => collect([$producer->phone, $producer->user?->phone])
            ->map(fn ($phone) => substr(preg_replace('/\D/', '', (string) $phone), -8))
            // Too few digits to be a number worth comparing.
            ->filter(fn (string $digits) => strlen($digits) === 8);

        $emails = fn (Producer $producer) => collect([$producer->contact_email, $producer->user?->email])
            ->filter()
            ->map(fn (string $email) => Str::lower(trim($email)));

        return $phones($referrer)->intersect($phones($approved))->isNotEmpty()
            || $emails($referrer)->intersect($emails($approved))->isNotEmpty();
    }

    /** A month of Premium each, added after whatever they already have. */
    private function reward(Referral $referral, Producer $approved, SubscriptionPlan $plan): void
    {
        $referrer = $referral->referrer;

        $forReferrer = $this->subscriptions->grant($referrer, $plan, self::REWARD_DAYS);
        $forNewcomer = $this->subscriptions->grant($approved, $plan, self::REWARD_DAYS);

        $referrer->user?->notify(SiteNotification::referralRewarded(
            $approved->name,
            $forReferrer->ends_at,
            route('producers.referrals.index', $referrer),
        ));

        $approved->user?->notify(SiteNotification::referralWelcome(
            $referrer->name,
            $forNewcomer->ends_at,
            route('memberships.index'),
        ));
    }
}
