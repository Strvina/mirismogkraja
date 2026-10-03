<?php

namespace App\Services;

use App\Models\Producer;
use App\Models\ProducerMessage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * How quickly a producer usually answers - the badge "Obično odgovara za
 * nekoliko sati" on their page. Read from their own conversations: each
 * time a buyer writes and is waiting, the time until the producer's next
 * message. The middle value of those, so one slow week does not define them.
 */
class ResponseTime
{
    /** Only recent behaviour counts. */
    private const WINDOW_DAYS = 90;

    /** Fewer answers than this say nothing yet. */
    private const MIN_ANSWERS = 3;

    private const CACHE_SECONDS = 6 * 60 * 60;

    /** The most messages read to work it out. */
    private const MAX_MESSAGES = 3000;

    /**
     * The bucket a producer falls in - "hour", "hours", "day" or "days" - or
     * null with too little to go on.
     */
    public function bucketFor(Producer $producer): ?string
    {
        $hours = Cache::remember("response-time:{$producer->id}", self::CACHE_SECONDS, fn () => $this->medianHours($producer));

        return match (true) {
            $hours === null => null,
            $hours < 1 => 'hour',
            $hours < 6 => 'hours',
            $hours < 24 => 'day',
            default => 'days',
        };
    }

    public function medianHours(Producer $producer): ?float
    {
        $messages = ProducerMessage::query()
            ->where('household_id', $producer->id)
            ->where('created_at', '>=', now()->subDays(self::WINDOW_DAYS))
            ->orderBy('id')
            ->limit(self::MAX_MESSAGES)
            ->get(['buyer_id', 'sender_id', 'created_at']);

        $waitingSince = [];
        $waits = [];

        foreach ($messages as $message) {
            $fromBuyer = $message->sender_id === $message->buyer_id;

            if ($fromBuyer) {
                // The first unanswered message starts the clock; more from
                // the buyer before an answer don't restart it.
                $waitingSince[$message->buyer_id] ??= $message->created_at;
            } elseif (isset($waitingSince[$message->buyer_id])) {
                /** @var Carbon $since */
                $since = $waitingSince[$message->buyer_id];
                $waits[] = $since->diffInMinutes($message->created_at) / 60;
                unset($waitingSince[$message->buyer_id]);
            }
        }

        if (count($waits) < self::MIN_ANSWERS) {
            return null;
        }

        sort($waits);
        $middle = intdiv(count($waits), 2);

        return count($waits) % 2 ? $waits[$middle] : ($waits[$middle - 1] + $waits[$middle]) / 2;
    }
}
