<?php

namespace App\Http\Controllers;

use App\Models\InquiryOutcome;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * One conversation between a buyer and a producer: opening it from a
 * product page, reading it, and writing in it. The inbox that lists them is
 * MessageInboxController; closing one or noting how it ended is
 * ConversationController.
 */
class ProducerMessageController extends Controller
{
    /**
     * New conversations one account may start in a day. Far above what a
     * buyer asking around needs; far below what it takes to message every
     * producer on the site.
     */
    public const NEW_CONVERSATIONS_PER_DAY = 20;

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
        $this->countNewConversation($request->user(), $product->producer);

        ProducerMessage::create([
            'producer_id' => $product->producer_id,
            'product_id' => $product->id,
            'buyer_id' => $request->user()->id,
            'sender_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        return to_route('messages.show', $product->producer->slug);
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
            // Both sides see who closed it: that side to undo it, and both
            // so the missing message box explains itself.
            'blockedBy' => $producer->blockedBy($buyer),
            // The other side has left the site: the history stays, the
            // message box goes.
            'closed' => match (true) {
                $producer->trashed() => 'producer',
                $buyer->trashed() => 'buyer',
                default => null,
            },
            // The producer's own note on how this inquiry ended.
            // A closure, like the other props the three-second poll does
            // not ask for, so polling never runs its query.
            'outcome' => fn () => $producer->user_id === $request->user()->id
                ? InquiryOutcome::where('producer_id', $producer->id)->where('buyer_id', $buyer->id)->value('status')
                : null,
            'outcomeLabels' => array_map(__(...), InquiryOutcome::STATUSES),
            // The producer's saved answers, for their side of the thread
            // only. A closure too: the poll never asks for it.
            'quickReplies' => fn () => $producer->user_id === $request->user()->id
                ? $producer->quickReplies()->get(['id', 'title', 'body'])
                : [],
            'reportReasons' => array_map(__(...), Report::REASONS),
            // Newest first so opening a thread lands on the latest reply;
            // the page is flipped back to chronological order below, and
            // "older messages" therefore means the next page.
            'messages' => tap(ProducerMessage::thread($producer, $buyer)
                // Only each product's main photo: the thread shows one.
                ->with(['sender:id,name,avatar_path', 'product:id,name,slug,price,unit', 'product.images' => fn ($images) => $images->orderBy('order')->limit(1)])
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

        if ($producer->user_id !== $request->user()->id) {
            $this->countNewConversation($request->user(), $producer);
        }

        ProducerMessage::create([
            'producer_id' => $producer->id,
            'buyer_id' => $buyer->id,
            'sender_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        return back();
    }

    /**
     * Counts a first message to a producer against the day's allowance;
     * a message in a conversation that already exists is not counted.
     */
    private function countNewConversation(User $buyer, Producer $producer): void
    {
        if (ProducerMessage::thread($producer, $buyer)->exists()) {
            return;
        }

        $key = 'new-conversations:'.$buyer->id;

        if (RateLimiter::tooManyAttempts($key, self::NEW_CONVERSATIONS_PER_DAY)) {
            throw ValidationException::withMessages([
                'body' => __('Danas ste započeli dosta novih razgovora. Novi možete sutra, a postojeći možete da nastavite.'),
            ]);
        }

        RateLimiter::hit($key, 24 * 60 * 60);
    }
}
