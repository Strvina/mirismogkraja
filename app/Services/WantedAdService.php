<?php

namespace App\Services;

use App\Jobs\NotifyProducersOfWantedAd;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\User;
use App\Models\WantedAd;
use App\Notifications\SiteNotification;
use App\Support\Admins;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * "Tražim" ads: a buyer posts one, producers answer it.
 *
 * An ad goes up without waiting, like a product or a story: the producers
 * who sell that kind of thing are told, and so are the admins, who can take
 * it down afterwards.
 */
class WantedAdService
{
    /**
     * Ads one producer may answer in a day. The mirror of the buyer's
     * allowance of new conversations: far above what answering real demand
     * takes, far below what it takes to write to every buyer on the site.
     */
    public const RESPONSES_PER_DAY = 20;

    /** @param  array<string, mixed>  $attributes */
    public function create(User $user, array $attributes): WantedAd
    {
        if ($user->wantedAds()->listed()->count() >= WantedAd::MAX_OPEN_PER_USER) {
            throw ValidationException::withMessages([
                'title' => __('Možete imati najviše :max otvorena oglasa. Zatvorite neki koji vam više ne treba.', ['max' => WantedAd::MAX_OPEN_PER_USER]),
            ]);
        }

        $ad = $user->wantedAds()->create([
            ...$attributes,
            'status' => WantedAd::STATUS_OPEN,
            'expires_at' => now()->addDays(WantedAd::DAYS_OPEN),
        ]);

        NotifyProducersOfWantedAd::dispatchAfterResponse($ad);

        Admins::notify(SiteNotification::forAdmins('wanted-posted', [
            'author' => $user->name,
            'title' => $ad->title,
        ], route('admin.wanted.index')));

        return $ad;
    }

    /**
     * A producer's answer: recorded once per ad, and written as the first -
     * or next - message in their conversation with the buyer, where
     * everything after it happens as in any other conversation.
     */
    public function respond(WantedAd $ad, Producer $producer, string $body): ProducerMessage
    {
        if ($ad->responses()->where('producer_id', $producer->id)->exists()) {
            throw ValidationException::withMessages([
                'body' => __('Na ovaj oglas ste već odgovorili. Razgovor nastavite u porukama.'),
            ]);
        }

        $key = 'wanted-responses:'.$producer->id;

        if (RateLimiter::tooManyAttempts($key, self::RESPONSES_PER_DAY)) {
            throw ValidationException::withMessages([
                'body' => __('Danas ste odgovorili na dosta oglasa. Na nove možete sutra, a započete razgovore možete da nastavite.'),
            ]);
        }

        $message = DB::transaction(function () use ($ad, $producer, $body) {
            $ad->responses()->create(['producer_id' => $producer->id]);

            return ProducerMessage::create([
                'producer_id' => $producer->id,
                'wanted_ad_id' => $ad->id,
                'buyer_id' => $ad->user_id,
                'sender_id' => $producer->user_id,
                'body' => $body,
            ]);
        });

        RateLimiter::hit($key, 24 * 60 * 60);

        return $message;
    }

    /** The author found what they wanted, or no longer needs it. */
    public function close(WantedAd $ad): void
    {
        // Never over an admin's block: closing is not a way to clear it.
        if ($ad->status === WantedAd::STATUS_OPEN) {
            $ad->update(['status' => WantedAd::STATUS_CLOSED]);
        }
    }

    /** An admin takes an ad down, or puts a blocked one back up. */
    public function moderate(WantedAd $ad, string $status): void
    {
        $previous = $ad->status;
        $ad->update(['status' => $status]);

        if ($previous !== WantedAd::STATUS_BLOCKED && $status === WantedAd::STATUS_BLOCKED) {
            $ad->user?->notify(SiteNotification::wantedAdBlocked($ad->title, route('wanted.index')));
        }
    }
}
