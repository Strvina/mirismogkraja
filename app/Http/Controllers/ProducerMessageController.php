<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\User;
use App\Notifications\SiteNotification;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class ProducerMessageController extends Controller
{
    /**
     * Start a conversation from a product page. The product is recorded on
     * the message so the thread shows what the first question was about;
     * everything after it - quantity, price, delivery - the two sides agree
     * on between themselves, so no order or fulfilment state is created.
     */
    public function storeInquiry(Request $request, Product $product): RedirectResponse
    {
        $product->load('producer');

        abort_unless($product->isPubliclyVisible(), 404);
        abort_if($product->producer->user_id === $request->user()->id, 403);

        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        $message = ProducerMessage::create([
            'household_id' => $product->household_id,
            'product_id' => $product->id,
            'buyer_id' => $request->user()->id,
            'sender_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        $this->notifyTheOtherSide($message, $product->producer, $request->user());

        return to_route('messages.show', $product->producer->slug);
    }

    /**
     * Every thread the user is part of, from either side: ones they started
     * as a buyer, and ones buyers started with producers they own. They're
     * listed together because a user can be both, and splitting them across
     * two pages means a seller clicking the header's message badge lands on
     * an inbox that doesn't contain the message they were notified about.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $ownedProducerIds = $user->producers()->pluck('id');

        $threads = $this->threadSummaries(
            $user,
            fn ($query) => $query->where(fn ($inner) => $inner
                ->where('buyer_id', $user->id)
                ->orWhereIn('household_id', $ownedProducerIds))
        )->map(function (array $thread) use ($ownedProducerIds) {
            $message = $thread['message'];
            $asProducer = $ownedProducerIds->contains($message->household_id);

            return [
                'key' => $message->household_id.'-'.$message->buyer_id,
                'as_producer' => $asProducer,
                'title' => $asProducer ? $message->buyer->name : $message->producer->name,
                'subtitle' => $asProducer ? $message->producer->name : null,
                'avatar_path' => $asProducer ? $message->buyer->avatar_path : $message->producer->logo_path,
                'href' => $asProducer
                    ? route('messages.thread', [$message->household_id, $message->buyer_id])
                    : route('messages.show', $message->producer->slug),
                'last_message' => $message->body,
                'last_at' => $message->created_at,
                'unread' => $thread['unread'],
            ];
        })->values();

        return Inertia::render('messages/index', ['threads' => $threads]);
    }

    /**
     * Threads for the producers the authenticated user owns - the seller's
     * side of the same conversations.
     */
    public function producerInbox(Request $request): Response
    {
        $user = $request->user();
        $producerIds = $user->producers()->pluck('id');

        $threads = $this->threadSummaries(
            $user,
            fn ($query) => $query->whereIn('household_id', $producerIds)
        )->map(fn (array $thread) => [
            'producer' => $thread['message']->producer,
            'buyer' => $thread['message']->buyer,
            'last_message' => $thread['message']->body,
            'last_at' => $thread['message']->created_at,
            'unread' => $thread['unread'],
        ])->values();

        return Inertia::render('messages/producer-inbox', ['threads' => $threads]);
    }

    /**
     * One thread, from whichever side is looking at it. Opening it marks the
     * other side's messages as read.
     */
    public function show(Request $request, Producer $producer, ?User $buyer = null): Response
    {
        $buyer ??= $request->user();

        $this->authorize('viewThread', [ProducerMessage::class, $producer, $buyer]);

        // Reading a thread is what clears its unread count and the header
        // badge. The pages that show those are kept honest on the client:
        // see resources/js/lib/revalidate-on-history-navigation.ts, since a
        // page restored by the Back button never reaches the server at all.
        ProducerMessage::thread($producer, $buyer)
            ->where('sender_id', '!=', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return Inertia::render('messages/show', [
            'producer' => $producer->only(['id', 'name', 'slug', 'logo_path']),
            'buyer' => $buyer->only(['id', 'name', 'avatar_path']),
            'isOwner' => $producer->user_id === $request->user()->id,
            // Newest first so opening a thread lands on the latest reply;
            // the page is flipped back to chronological order below, and
            // "older messages" therefore means the next page.
            'messages' => tap(ProducerMessage::thread($producer, $buyer)
                ->with(['sender:id,name,avatar_path', 'product:id,name,slug,price,unit', 'product.images'])
                ->latest('id')
                ->paginate(50)
                ->withQueryString()
                ->through(fn (ProducerMessage $message) => [
                    'id' => $message->id,
                    'body' => $message->body,
                    'created_at' => $message->created_at,
                    'mine' => $message->sender_id === $request->user()->id,
                    'sender' => $message->sender->only(['id', 'name', 'avatar_path']),
                    // The thumbnail and price ride along so the thread shows
                    // what was asked about, not just its name.
                    'product' => $message->product === null ? null : [
                        'id' => $message->product->id,
                        'name' => $message->product->name,
                        'slug' => $message->product->slug,
                        'price' => $message->product->price,
                        'unit' => $message->product->unit,
                        'image' => $message->product->images->first()?->path,
                    ],
                ]), fn (LengthAwarePaginator $page) => $page->setCollection($page->getCollection()->reverse()->values())),
        ]);
    }

    public function store(Request $request, Producer $producer, ?User $buyer = null): RedirectResponse
    {
        $buyer ??= $request->user();

        $this->authorize('viewThread', [ProducerMessage::class, $producer, $buyer]);

        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        $message = ProducerMessage::create([
            'household_id' => $producer->id,
            'buyer_id' => $buyer->id,
            'sender_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        $this->notifyTheOtherSide($message, $producer, $request->user());

        return back();
    }

    /**
     * Tell whoever did not write the message that it arrived. Which side that
     * is depends on who sent it: a buyer writes to the producer's owner, the
     * owner writes back to the buyer.
     */
    private function notifyTheOtherSide(ProducerMessage $message, Producer $producer, User $sender): void
    {
        $recipient = $sender->id === $producer->user_id
            ? $message->buyer
            : $producer->user;

        // A producer whose account has been archived has no one to tell.
        if (! $recipient || $recipient->id === $sender->id) {
            return;
        }

        $url = $recipient->id === $producer->user_id
            ? route('messages.thread', [$producer->id, $message->buyer_id])
            : route('messages.show', $producer->slug);

        $recipient->notify(SiteNotification::messageReceived(
            $sender->id === $producer->user_id ? $producer->name : $sender->name,
            str($message->body)->limit(80)->toString(),
            $url,
        ));
    }

    /**
     * A thread is a (producer, buyer) pair rather than a table of its own, so
     * its summary is aggregated in one grouped query: the id of its newest
     * message and how many of them the viewer hasn't read. Using max(id) -
     * not max(created_at) - makes "last message" unambiguous when a reply
     * lands in the same second as the message it answers, and it keeps the
     * whole inbox to two queries instead of loading every message of every
     * conversation into memory.
     *
     * @param  Closure(Builder<ProducerMessage>): mixed  $scope
     * @return Collection<int, array{message: ProducerMessage, unread: int}>
     */
    private function threadSummaries(User $viewer, Closure $scope): Collection
    {
        $aggregates = ProducerMessage::query()
            ->tap($scope)
            ->selectRaw('max(id) as last_message_id')
            ->selectRaw('sum(case when sender_id != ? and read_at is null then 1 else 0 end) as unread_count', [$viewer->id])
            ->groupBy('household_id', 'buyer_id')
            ->get();

        $messages = ProducerMessage::query()
            ->whereIn('id', $aggregates->pluck('last_message_id'))
            ->with(['producer:id,name,slug,logo_path', 'buyer:id,name,avatar_path'])
            ->get()
            ->keyBy('id');

        return $aggregates
            ->map(fn ($row) => [
                'message' => $messages[$row->last_message_id],
                // SQLite hands sum() back as a string.
                'unread' => (int) $row->unread_count,
            ])
            ->sortByDesc(fn (array $thread) => $thread['message']->id)
            ->values();
    }
}
