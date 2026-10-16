<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * Conversations between buyers and producers, as both the messages pages
 * and the chat window in the corner use them: one way to read a thread,
 * write in it, count what is unread and list them, so the two never show
 * different numbers or let through different things.
 */
class Messaging
{
    /**
     * New conversations one account may start in a day. Far above what a
     * buyer asking around needs; far below what it takes to message every
     * producer on the site.
     */
    public const NEW_CONVERSATIONS_PER_DAY = 20;

    /**
     * Messages the user has not read, across every conversation they are in.
     *
     * Read from the conversations' own counters (App\Models\Conversation):
     * this runs on every page of every signed-in visitor. Two sums rather
     * than one with an OR, so each is answered by its own index; the halves
     * never overlap, since nobody writes to their own producer.
     */
    public function unreadCount(User $user): int
    {
        $asBuyer = (int) Conversation::query()->where('buyer_id', $user->id)->sum('unread_by_buyer');

        $asSeller = (int) Conversation::query()
            ->whereIn('producer_id', $user->producers()->select('id'))
            ->sum('unread_by_producer');

        return $asBuyer + $asSeller;
    }

    /**
     * The viewer has opened the thread and seen it: the other side's
     * messages are read. Only ever called for a thread actually on screen -
     * its page, or the chat window open and in view.
     */
    public function markRead(User $viewer, Producer $producer, User $buyer): int
    {
        $read = ProducerMessage::thread($producer, $buyer)
            ->where('sender_id', '!=', $viewer->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        if ($read > 0) {
            Conversation::markRead($producer->id, $buyer->id, byBuyer: $viewer->id === $buyer->id);
        }

        return $read;
    }

    /**
     * Writes a message into a thread. The caller has checked that the sender
     * may (ProducerMessagePolicy::send).
     *
     * @param  array{product_id?: int}  $context
     */
    public function send(User $sender, Producer $producer, User $buyer, string $body, array $context = []): ProducerMessage
    {
        if ($producer->user_id !== $sender->id) {
            $this->countNewConversation($sender, $producer);
        }

        return ProducerMessage::create([
            'producer_id' => $producer->id,
            'buyer_id' => $buyer->id,
            'sender_id' => $sender->id,
            'body' => $body,
            ...$context,
        ]);
    }

    /**
     * What applies to a first message to a producer and not to one in a
     * conversation that already exists: the producer has to be taking new
     * inquiries, and it counts against the buyer's allowance for the day.
     */
    public function countNewConversation(User $buyer, Producer $producer): void
    {
        if (ProducerMessage::thread($producer, $buyer)->exists()) {
            return;
        }

        // The page says so and hides the form; this is for a form left open
        // from before the pause.
        if ($producer->isPaused()) {
            throw ValidationException::withMessages([
                'body' => __('Proizvođač trenutno ne prima nove upite. Zapratite ga i javićemo vam kad se vrati.'),
            ]);
        }

        $key = 'new-conversations:'.$buyer->id;

        if (RateLimiter::tooManyAttempts($key, self::NEW_CONVERSATIONS_PER_DAY)) {
            throw ValidationException::withMessages([
                'body' => __('Danas ste započeli dosta novih razgovora. Novi možete sutra, a postojeći možete da nastavite.'),
            ]);
        }

        RateLimiter::hit($key, 24 * 60 * 60);
    }

    /**
     * What presenting a message needs loaded - of a product, only its main
     * photo: the thread shows one.
     *
     * @return array<int|string, mixed>
     */
    public static function presentedWith(): array
    {
        return ['sender:id,name,avatar_path', 'wantedAd:id,title', 'product:id,name,slug,price,unit', 'product.images' => fn ($images) => $images->orderBy('order')->limit(1)];
    }

    /**
     * A message as a thread shows it to the viewer. Wants `sender`,
     * `wantedAd`, `product` and `product.images` loaded.
     *
     * @return array<string, mixed>
     */
    public function present(ProducerMessage $message, User $viewer): array
    {
        return [
            'id' => $message->id,
            'body' => $message->body,
            'created_at' => $message->created_at,
            'mine' => $message->sender_id === $viewer->id,
            'sender' => $message->sender->only(['id', 'name', 'avatar_path']),
            // The thumbnail and price ride along so the thread shows what was
            // asked about, not just its name.
            'product' => $message->product === null ? null : [
                'id' => $message->product->id,
                'name' => $message->product->name,
                'slug' => $message->product->slug,
                'price' => $message->product->price,
                'unit' => $message->product->unit,
                'image' => $message->product->images->first()?->path,
            ],
            // A producer's answer to a "Tražim" ad says which one.
            'wanted_ad' => $message->wantedAd?->only(['id', 'title']),
        ];
    }

    /**
     * The viewer's conversations, newest first, each with its last message
     * and how many of the other side's messages the viewer hasn't read: one
     * row each in `conversations`, kept current as messages are written and
     * read (see App\Models\Conversation), rather than every message the
     * viewer ever exchanged grouped on every visit.
     *
     * Each as the inbox lists it: who is on the other side, the last message
     * and the way into the thread - its page, and the two ids that name it.
     *
     * @param  Collection<int, int>  $ownedProducerIds
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    public function summaries(User $viewer, Collection $ownedProducerIds, int $perPage): LengthAwarePaginator
    {
        $conversations = Conversation::query()
            ->whereNotNull('last_message_id')
            // Someone who owns no producer is only ever the buyer: no OR, so
            // the index on buyer_id answers it alone.
            ->when(
                $ownedProducerIds->isEmpty(),
                fn ($query) => $query->where('buyer_id', $viewer->id),
                fn ($query) => $query->where(fn ($inner) => $inner->where('buyer_id', $viewer->id)->orWhereIn('producer_id', $ownedProducerIds)),
            )
            ->orderByDesc('last_message_id')
            ->with(['lastMessage.producer:id,name,slug,logo_path', 'lastMessage.buyer:id,name,avatar_path'])
            ->paginate($perPage);

        /** @var LengthAwarePaginator<int, array<string, mixed>> */
        return $conversations->through(function (Conversation $conversation) use ($ownedProducerIds, $viewer) {
            // whereNotNull above: every row here has its last message.
            $message = $conversation->lastMessage;
            $asProducer = $ownedProducerIds->contains($message->producer_id);

            return [
                'key' => $message->producer_id.'-'.$message->buyer_id,
                'producer_id' => $message->producer_id,
                'buyer_id' => $message->buyer_id,
                'as_producer' => $asProducer,
                'title' => $asProducer ? $message->buyer->name : $message->producer->name,
                'subtitle' => $asProducer ? $message->producer->name : null,
                'avatar_path' => $asProducer ? $message->buyer->avatar_path : $message->producer->logo_path,
                'href' => $asProducer
                    ? route('messages.thread', [$message->producer_id, $message->buyer_id])
                    : route('messages.show', $message->producer->slug),
                'last_message' => $message->body,
                // "Vi: ..." before one's own last word, as a chat list shows it.
                'last_mine' => $message->sender_id === $viewer->id,
                'last_at' => $message->created_at,
                'unread' => $asProducer ? $conversation->unread_by_producer : $conversation->unread_by_buyer,
            ];
        });
    }
}
