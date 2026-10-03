<?php

namespace App\Support;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use Throwable;

/**
 * Push notifications to a person's phone or computer (Web Push, VAPID),
 * shown by public/sw.js even when the site is not open.
 *
 * Off until VAPID keys are configured (php artisan push:vapid). Never
 * throws: a push that cannot be delivered is logged, and a subscription the
 * push service reports as gone is deleted, so a dead device is not tried
 * forever.
 */
class Push
{
    public static function enabled(): bool
    {
        return filled(config('services.webpush.public_key')) && filled(config('services.webpush.private_key'));
    }

    /** What a page needs to subscribe, or null while push is off. */
    public static function publicKey(): ?string
    {
        return self::enabled() ? config('services.webpush.public_key') : null;
    }

    /**
     * @param  array{title: string, body?: string, url?: string, tag?: string}  $payload
     */
    public function send(User $user, array $payload): int
    {
        if (! self::enabled()) {
            return 0;
        }

        $subscriptions = PushSubscription::where('user_id', $user->id)->get();

        if ($subscriptions->isEmpty()) {
            return 0;
        }

        try {
            $webPush = $this->client();

            foreach ($subscriptions as $subscription) {
                $webPush->queueNotification(Subscription::create([
                    'endpoint' => $subscription->endpoint,
                    'publicKey' => $subscription->public_key,
                    'authToken' => $subscription->auth_token,
                    'contentEncoding' => $subscription->content_encoding ?? 'aes128gcm',
                ]), (string) json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            }

            $delivered = 0;

            foreach ($webPush->flush() as $report) {
                if ($report->isSuccess()) {
                    $delivered++;
                } elseif ($report->isSubscriptionExpired()) {
                    PushSubscription::where('endpoint_hash', PushSubscription::hashFor($report->getEndpoint()))->delete();
                } else {
                    Log::warning('Push not delivered.', ['reason' => $report->getReason()]);
                }
            }

            return $delivered;
        } catch (Throwable $e) {
            report($e);

            return 0;
        }
    }

    protected function client(): WebPush
    {
        return new WebPush([
            'VAPID' => [
                'subject' => config('services.webpush.subject') ?: config('app.url'),
                'publicKey' => config('services.webpush.public_key'),
                'privateKey' => config('services.webpush.private_key'),
            ],
        ], ['TTL' => 24 * 60 * 60, 'urgency' => 'high']);
    }
}
