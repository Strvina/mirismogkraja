<?php

namespace App\Jobs;

use App\Models\ProducerMessage;
use App\Models\User;
use App\Support\LocalUrl;
use App\Support\Push;
use Illuminate\Bus\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Str;
use Illuminate\Support\Traits\Localizable;

/**
 * A new message, pushed to the other side's devices the moment it is sent
 * - a producer at the market sees the inquiry on their phone. Runs after
 * the response, so the sender never waits on push services.
 *
 * One notification per conversation on a device: the tag makes a newer
 * message replace the older one instead of stacking a column of them.
 */
class PushNewMessage
{
    use Dispatchable, Localizable, Queueable;

    public function __construct(private readonly ProducerMessage $message) {}

    public function handle(Push $push): void
    {
        $message = $this->message->loadMissing(['producer.user', 'buyer', 'sender:id,name']);
        $toSeller = $message->sender_id === $message->buyer_id;
        $recipient = $toSeller ? $message->producer?->user : $message->buyer;

        if (! $recipient instanceof User || $recipient->trashed() || $recipient->blocked_at !== null) {
            return;
        }

        $from = $toSeller ? ($message->sender?->name ?? '') : $message->producer->name;

        // In the recipient's language, not the sender's.
        $payload = $this->withLocale($recipient->preferredLocale() ?? config('app.locale'), fn () => [
            'title' => __('Nova poruka od :name', ['name' => $from]),
            'body' => Str::limit(Str::squish($message->body), 140),
            'url' => LocalUrl::path($toSeller
                ? route('messages.thread', [$message->household_id, $message->buyer_id])
                : route('messages.show', $message->producer->slug)),
            'tag' => "thread-{$message->household_id}-{$message->buyer_id}",
        ]);

        $push->send($recipient, $payload);
    }
}
