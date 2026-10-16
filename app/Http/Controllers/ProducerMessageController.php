<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\InquiryOutcome;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\Report;
use App\Models\User;
use App\Services\Messaging;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\Paginator;
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
     * Start a conversation from a product page. The product is recorded on
     * the message so the thread shows what the first question was about;
     * everything after it - quantity, price, delivery - the two sides agree
     * on between themselves, so no order or fulfilment state is created.
     */
    public function storeInquiry(Request $request, Product $product, Messaging $messaging): RedirectResponse
    {
        $product->load('producer');

        abort_unless($product->isPubliclyVisible(), 404);
        abort_if($product->producer->user_id === $request->user()->id, 403);
        abort_if($product->producer->hasBlocked($request->user()), 403);

        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        $messaging->send($request->user(), $product->producer, $request->user(), $data['body'], ['product_id' => $product->id]);

        return to_route('messages.show', $product->producer->slug);
    }

    /**
     * One thread, from whichever side is looking at it. Opening it marks the
     * other side's messages as read.
     */
    public function show(Request $request, Producer $producer, Messaging $messaging, ?User $buyer = null): Response
    {
        $buyer ??= $request->user();

        $this->authorize('viewThread', [ProducerMessage::class, $producer, $buyer]);

        // Reading a thread is what clears its unread count and the header
        // badge. The pages that show those are kept honest on the client:
        // see resources/js/lib/revalidate-on-history-navigation.ts, since a
        // page restored by the Back button never reaches the server at all.
        $messaging->markRead($request->user(), $producer, $buyer);

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
                ->with(Messaging::presentedWith())
                ->latest('id')
                // Simple pagination: the page only needs to know whether
                // there are older messages, and the thread is re-read every
                // three seconds while open - a COUNT each time would be
                // waste.
                ->simplePaginate(50)
                ->withQueryString()
                ->through(fn (ProducerMessage $message) => $messaging->present($message, $request->user())), fn (Paginator $page) => $page->setCollection($page->getCollection()->reverse()->values())),
        ]);
    }

    public function store(Request $request, Producer $producer, Messaging $messaging, ?User $buyer = null): RedirectResponse
    {
        $buyer ??= $request->user();

        $this->authorize('send', [ProducerMessage::class, $producer, $buyer]);

        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        $messaging->send($request->user(), $producer, $buyer, $data['body']);

        return back();
    }
}
