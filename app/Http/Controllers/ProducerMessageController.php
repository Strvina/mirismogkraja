<?php

namespace App\Http\Controllers;

use App\Models\InquiryOutcome;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\Report;
use App\Models\User;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
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
        abort_if($product->producer->hasBlocked($request->user()), 403);

        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        ProducerMessage::create([
            'household_id' => $product->household_id,
            'product_id' => $product->id,
            'buyer_id' => $request->user()->id,
            'sender_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

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
        );

        // The producer's own note on each of their threads, in one query.
        $outcomes = InquiryOutcome::query()
            ->whereIn('household_id', $ownedProducerIds)
            ->get(['household_id', 'buyer_id', 'status'])
            ->mapWithKeys(fn (InquiryOutcome $outcome) => [$outcome->household_id.'-'.$outcome->buyer_id => $outcome->status]);

        $threads = $threads->map(function (array $thread) use ($ownedProducerIds, $outcomes) {
            $message = $thread['message'];
            $asProducer = $ownedProducerIds->contains($message->household_id);
            $key = $message->household_id.'-'.$message->buyer_id;

            return [
                'key' => $key,
                'as_producer' => $asProducer,
                // Only the producer sees it; it is their own record.
                'outcome' => $asProducer && isset($outcomes[$key]) ? __(InquiryOutcome::STATUSES[$outcomes[$key]] ?? '') : null,
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
            // Both sides see it: the producer to undo it, and both so the
            // missing message box explains itself.
            'blocked' => $producer->hasBlocked($buyer),
            // The producer's own note on how this inquiry ended.
            // A closure, like the other props the three-second poll does
            // not ask for, so polling never runs its query.
            'outcome' => fn () => $producer->user_id === $request->user()->id
                ? InquiryOutcome::where('household_id', $producer->id)->where('buyer_id', $buyer->id)->value('status')
                : null,
            'outcomeLabels' => array_map(__(...), InquiryOutcome::STATUSES),
            'reportReasons' => array_map(__(...), Report::REASONS),
            // Newest first so opening a thread lands on the latest reply;
            // the page is flipped back to chronological order below, and
            // "older messages" therefore means the next page.
            'messages' => tap(ProducerMessage::thread($producer, $buyer)
                ->with(['sender:id,name,avatar_path', 'product:id,name,slug,price,unit', 'product.images'])
                ->latest('id')
                // Simple pagination: the page only needs to know whether
                // there are older messages, and the thread is re-read every
                // three seconds while open - a COUNT each time would be
                // waste.
                ->simplePaginate(50)
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
                ]), fn (Paginator $page) => $page->setCollection($page->getCollection()->reverse()->values())),
        ]);
    }

    public function store(Request $request, Producer $producer, ?User $buyer = null): RedirectResponse
    {
        $buyer ??= $request->user();

        $this->authorize('send', [ProducerMessage::class, $producer, $buyer]);

        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        ProducerMessage::create([
            'household_id' => $producer->id,
            'buyer_id' => $buyer->id,
            'sender_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        return back();
    }

    /**
     * The producer notes how an inquiry ended - for their own record, and
     * the admin's unverified picture of what sells. Empty clears it.
     */
    public function setOutcome(Request $request, Producer $producer, User $buyer): RedirectResponse
    {
        $this->authorize('update', $producer);
        $this->authorize('viewThread', [ProducerMessage::class, $producer, $buyer]);

        $data = $request->validate(['status' => ['nullable', Rule::in(array_keys(InquiryOutcome::STATUSES))]]);

        $thread = InquiryOutcome::where('household_id', $producer->id)->where('buyer_id', $buyer->id);

        if (empty($data['status'])) {
            $thread->delete();

            return back();
        }

        InquiryOutcome::upsert([[
            'household_id' => $producer->id,
            'buyer_id' => $buyer->id,
            'status' => $data['status'],
            // What the conversation was opened about, if it came from a
            // product page.
            'product_id' => ProducerMessage::thread($producer, $buyer)->whereNotNull('product_id')->oldest('id')->value('product_id'),
            'updated_at' => now(),
        ]], ['household_id', 'buyer_id'], ['status', 'product_id', 'updated_at']);

        return back();
    }

    /**
     * The producer stops, or resumes, taking messages from this buyer. Only
     * for a conversation the buyer started - there is nobody else to block.
     */
    public function toggleBlock(Request $request, Producer $producer, User $buyer): RedirectResponse
    {
        $this->authorize('update', $producer);
        $this->authorize('viewThread', [ProducerMessage::class, $producer, $buyer]);

        $producer->blockedBuyers()->toggle($buyer->id);

        return back();
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
