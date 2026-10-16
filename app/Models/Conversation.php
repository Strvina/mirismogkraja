<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * One row per (producer, buyer) pair that has written: its newest message
 * and how many of the other side's messages each side has not read.
 *
 * The messages stay the record; this is a summary kept beside them so the
 * inbox and the header's badge read one short row per conversation rather
 * than grouping every message a user ever exchanged (docs/performance.md,
 * item 10). Kept current by ProducerMessage (a new message) and by
 * ProducerMessageController::show (a thread read). rebuild() works it all
 * out again from the messages, for the migration that created it and for
 * `php artisan messages:rebuild-conversations` should it ever drift.
 *
 * @property int $id
 * @property int $producer_id
 * @property int $buyer_id
 * @property int|null $last_message_id
 * @property int $unread_by_producer
 * @property int $unread_by_buyer
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Producer $producer
 * @property-read User $buyer
 * @property-read ProducerMessage|null $lastMessage
 */
class Conversation extends Model
{
    protected $fillable = ['producer_id', 'buyer_id'];

    protected function casts(): array
    {
        return [
            'unread_by_producer' => 'integer',
            'unread_by_buyer' => 'integer',
        ];
    }

    /** @return BelongsTo<Producer, $this> */
    public function producer(): BelongsTo
    {
        // As on a message: an archived producer's conversations stay readable.
        return $this->belongsTo(Producer::class)->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id')->withTrashed();
    }

    /** @return BelongsTo<ProducerMessage, $this> */
    public function lastMessage(): BelongsTo
    {
        return $this->belongsTo(ProducerMessage::class, 'last_message_id');
    }

    /**
     * A message was written: it is the newest, and the side it was written
     * to has one more to read. In single statements, so two messages
     * arriving together cannot overwrite each other's count, and a message
     * saved after a later one cannot take its place as the newest.
     */
    public static function recordMessage(ProducerMessage $message): void
    {
        static::query()->insertOrIgnore([
            'producer_id' => $message->producer_id,
            'buyer_id' => $message->buyer_id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $changes = [
            'last_message_id' => DB::raw('CASE WHEN last_message_id IS NULL OR last_message_id < '.(int) $message->id.' THEN '.(int) $message->id.' ELSE last_message_id END'),
            'updated_at' => now(),
        ];

        // A message written as already read (the demo data has them) is
        // nobody's to read.
        if ($message->read_at === null) {
            $unread = $message->sender_id === $message->buyer_id ? 'unread_by_producer' : 'unread_by_buyer';
            $changes[$unread] = DB::raw("{$unread} + 1");
        }

        static::query()
            ->where('producer_id', $message->producer_id)
            ->where('buyer_id', $message->buyer_id)
            ->update($changes);
    }

    /** One side opened the conversation and has read everything in it. */
    public static function markRead(int $producerId, int $buyerId, bool $byBuyer): void
    {
        static::query()
            ->where('producer_id', $producerId)
            ->where('buyer_id', $buyerId)
            ->update([$byBuyer ? 'unread_by_buyer' : 'unread_by_producer' => 0]);
    }

    /**
     * Every conversation worked out again from the messages themselves.
     * Messages a buyer wrote are the producer's to read, and the rest the
     * buyer's.
     */
    public static function rebuild(): int
    {
        return DB::transaction(function () {
            DB::table('conversations')->delete();

            return DB::table('conversations')->insertUsing(
                ['producer_id', 'buyer_id', 'last_message_id', 'unread_by_producer', 'unread_by_buyer', 'created_at', 'updated_at'],
                DB::table('producer_messages')
                    ->select('producer_id', 'buyer_id')
                    ->selectRaw('max(id)')
                    ->selectRaw('sum(case when sender_id = buyer_id and read_at is null then 1 else 0 end)')
                    ->selectRaw('sum(case when sender_id != buyer_id and read_at is null then 1 else 0 end)')
                    ->selectRaw('min(created_at)')
                    ->selectRaw('max(created_at)')
                    ->groupBy('producer_id', 'buyer_id'),
            );
        });
    }
}
