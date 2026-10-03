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
            ->where('producer_id', $producer->id)
            ->where('created_at', '>=', now()->subDays(self::WINDOW_DAYS))
            ->orderBy('id')
            ->limit(self::MAX_MESSAGES)
            ->get(['buyer_id', 'sender_id', 'created_at']);

        $waits = self::waits($messages);

        return count($waits) < self::MIN_ANSWERS ? null : self::median($waits);
    }

    /**
     * Hours from each time a buyer started waiting to the producer's next
     * message. A second message from the buyer while waiting does not
     * restart the clock.
     *
     * @param  iterable<object{buyer_id: int, sender_id: int, created_at: Carbon}>  $messages  Oldest first.
     * @return list<float>
     */
    public static function waits(iterable $messages): array
    {
        $waitingSince = [];
        $waits = [];

        foreach ($messages as $message) {
            if ($message->sender_id === $message->buyer_id) {
                $waitingSince[$message->buyer_id] ??= $message->created_at;
            } elseif (isset($waitingSince[$message->buyer_id])) {
                $waits[] = $waitingSince[$message->buyer_id]->diffInMinutes($message->created_at) / 60;
                unset($waitingSince[$message->buyer_id]);
            }
        }

        return $waits;
    }

    /** @param  non-empty-list<float>  $values */
    public static function median(array $values): float
    {
        sort($values);
        $middle = intdiv(count($values), 2);

        return count($values) % 2 ? $values[$middle] : ($values[$middle - 1] + $values[$middle]) / 2;
    }
}
