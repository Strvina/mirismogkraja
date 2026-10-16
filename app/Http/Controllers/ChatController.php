<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\User;
use App\Services\Messaging;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The chat window in the corner of every page: the same conversations as
 * the messages pages, read and written without leaving the page one is on.
 *
 * Nothing here is its own: who may read or write a thread is
 * ProducerMessagePolicy, as on the pages, and reading, writing and counting
 * are App\Services\Messaging, so the window and the pages always agree.
 */
class ChatController extends Controller
{
    /** Conversations in the window's list; the rest are on the messages page. */
    private const THREADS_LISTED = 20;

    /** Messages a thread opens with, and each step back into its history. */
    private const MESSAGES_PER_STEP = 30;

    /** The list of conversations, newest first, with the count on the header badge. */
    public function conversations(Request $request, Messaging $messaging): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'threads' => $messaging->summaries($user, $user->producers()->pluck('id'), self::THREADS_LISTED)->items(),
            'unread' => $messaging->unreadCount($user),
        ]);
    }

    /**
     * One thread. By default its newest messages; `after` an id, only what
     * came since (what the open window asks for as it checks for replies);
     * `before` an id, the step of history above it.
     *
     * `read` says the window is open and in view: only then do the other
     * side's messages count as read - never because the window merely
     * loaded, or is folded away.
     */
    public function thread(Request $request, Producer $producer, User $buyer, Messaging $messaging): JsonResponse
    {
        $viewer = $request->user();

        $this->authorize('viewThread', [ProducerMessage::class, $producer, $buyer]);

        if ($request->boolean('read')) {
            $messaging->markRead($viewer, $producer, $buyer);
        }

        $after = $request->integer('after');
        $before = $request->integer('before');

        $messages = ProducerMessage::thread($producer, $buyer)
            ->with(Messaging::presentedWith())
            ->when($after > 0, fn ($query) => $query->where('id', '>', $after)->oldest('id')->limit(100))
            ->when($after <= 0, fn ($query) => $query
                ->when($before > 0, fn ($older) => $older->where('id', '<', $before))
                ->latest('id')
                // One more than shown: whether there is history above.
                ->limit(self::MESSAGES_PER_STEP + 1))
            ->get();

        $hasOlder = $after <= 0 && $messages->count() > self::MESSAGES_PER_STEP;
        $messages = $after > 0 ? $messages : $messages->take(self::MESSAGES_PER_STEP)->reverse()->values();

        $owner = $producer->user_id === $viewer->id;

        return response()->json([
            'thread' => [
                'key' => $producer->id.'-'.$buyer->id,
                'producer_id' => $producer->id,
                'buyer_id' => $buyer->id,
                'title' => $owner ? $buyer->name : $producer->name,
                'avatar_path' => $owner ? $buyer->avatar_path : $producer->logo_path,
                'href' => $owner ? route('messages.thread', [$producer->id, $buyer->id]) : route('messages.show', $producer->slug),
                // Why there is no message box, when there is none: the same
                // reasons the thread's page gives.
                'closed' => match (true) {
                    $producer->trashed() => 'producer',
                    $buyer->trashed() => 'buyer',
                    default => null,
                },
                'blocked_by' => $producer->blockedBy($buyer),
                'can_send' => $viewer->can('send', [ProducerMessage::class, $producer, $buyer]),
            ],
            'messages' => $messages->map(fn (ProducerMessage $message) => $messaging->present($message, $viewer)),
            'has_older' => $hasOlder,
            'unread' => $messaging->unreadCount($viewer),
        ]);
    }

    /**
     * A question about a product, asked from its page or its popup, under
     * the same rules as the page's own form - answered with the conversation
     * it went into, for the window to open, instead of a page to go to.
     */
    public function inquiry(Request $request, Product $product, Messaging $messaging): JsonResponse
    {
        $product->load('producer');
        $buyer = $request->user();

        abort_unless($product->isPubliclyVisible(), 404);
        abort_if($product->producer->user_id === $buyer->id, 403);
        abort_if($product->producer->hasBlocked($buyer), 403);

        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        $messaging->send($buyer, $product->producer, $buyer, $data['body'], ['product_id' => $product->id]);

        return response()->json(['thread' => [
            'producer_id' => $product->producer->id,
            'buyer_id' => $buyer->id,
            'title' => $product->producer->name,
            'avatar_path' => $product->producer->logo_path,
        ]], 201);
    }

    /** Writes into a thread and answers with the message as it was saved. */
    public function send(Request $request, Producer $producer, User $buyer, Messaging $messaging): JsonResponse
    {
        $this->authorize('send', [ProducerMessage::class, $producer, $buyer]);

        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        $message = $messaging->send($request->user(), $producer, $buyer, $data['body'])->load(Messaging::presentedWith());

        return response()->json(['message' => $messaging->present($message, $request->user())], 201);
    }
}
