<?php

namespace App\Console\Commands;

use App\Models\ProducerMessage;
use App\Models\User;
use App\Notifications\UnreadMessages;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Throwable;

/**
 * Tells people by e-mail about messages they haven't read - above all a
 * producer about a buyer's inquiry, which otherwise waits until they happen
 * to open the site. Runs every five minutes (routes/console.php).
 *
 * One mail per conversation and direction, never sooner than GRACE_MINUTES
 * after the message (a reply in a conversation that is open on screen gets
 * read there), and at most one per QUIET_HOURS while it stays unread.
 */
class EmailUnreadMessages extends Command
{
    protected $signature = 'messages:email-unread';

    protected $description = 'E-mail people about messages they have not read yet';

    public const GRACE_MINUTES = 10;

    public const QUIET_HOURS = 3;

    /** A message unread for longer than this gets no first mail anymore. */
    private const MAX_AGE_DAYS = 3;

    /** Per run; the rest waits five minutes. */
    private const BATCH = 1000;

    public function handle(): int
    {
        $messages = ProducerMessage::query()
            ->whereNull('read_at')
            ->whereNull('emailed_at')
            ->whereBetween('created_at', [now()->subDays(self::MAX_AGE_DAYS), now()->subMinutes(self::GRACE_MINUTES)])
            ->with(['producer:id,user_id,name,slug,deleted_at', 'producer.user', 'sender:id,name,deleted_at'])
            ->orderBy('id')
            ->limit(self::BATCH)
            ->get();

        $buyers = User::withTrashed()->whereIn('id', $messages->pluck('buyer_id')->unique())->get()->keyBy('id');
        $sent = 0;

        // One group per conversation and direction: the buyer's messages go
        // to the producer's owner, the producer's to the buyer.
        foreach ($messages->groupBy(fn (ProducerMessage $message) => $message->producer_id.'-'.$message->buyer_id.'-'.($message->sender_id === $message->buyer_id ? 'seller' : 'buyer')) as $group) {
            $sent += (int) $this->mail($group, $buyers);
        }

        $this->info("Sent {$sent} e-mail(s).");

        return self::SUCCESS;
    }

    /** @param  Collection<int, ProducerMessage>  $group */
    private function mail(Collection $group, Collection $buyers): bool
    {
        $latest = $group->last();
        $toSeller = $latest->sender_id === $latest->buyer_id;
        $recipient = $toSeller ? $latest->producer?->user : $buyers->get($latest->buyer_id);
        $ids = $group->modelKeys();

        if (! $this->wantsMail($recipient) || $latest->producer === null || $latest->producer->trashed()) {
            // Nothing to send now or later: don't look at these again.
            ProducerMessage::whereKey($ids)->update(['emailed_at' => now()]);

            return false;
        }

        // Mailed about this conversation a little while ago and still not
        // read: the next mail waits, these stay for a later run.
        $recentlyMailed = ProducerMessage::thread($latest->producer, $buyers->get($latest->buyer_id))
            ->where('sender_id', '!=', $recipient->id)
            ->where('emailed_at', '>=', now()->subHours(self::QUIET_HOURS))
            ->exists();

        if ($recentlyMailed) {
            return false;
        }

        try {
            $recipient->notify(new UnreadMessages(
                from: $toSeller ? ($latest->sender?->name ?? '') : $latest->producer->name,
                count: $group->count(),
                preview: $latest->body,
                url: $toSeller
                    ? route('messages.thread', [$latest->producer_id, $latest->buyer_id])
                    : route('messages.show', $latest->producer->slug),
            ));
        } catch (Throwable $e) {
            // Left unmarked, so the next run tries again.
            report($e);

            return false;
        }

        ProducerMessage::whereKey($ids)->update(['emailed_at' => now()]);

        return true;
    }

    private function wantsMail(?User $recipient): bool
    {
        return $recipient !== null
            && ! $recipient->trashed()
            && $recipient->blocked_at === null
            && $recipient->email_verified_at !== null
            && $recipient->notify_messages_by_email;
    }
}
