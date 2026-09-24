<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
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

        $threads = ProducerMessage::query()
            ->where(fn ($query) => $query
                ->where('buyer_id', $user->id)
                ->orWhereIn('household_id', $ownedProducerIds))
            ->with(['producer:id,name,slug,logo_path', 'buyer:id,name,avatar_path'])
            // id breaks the tie: two messages can share a created_at second.
            ->latest()
            ->latest('id')
            ->get()
            ->groupBy(fn (ProducerMessage $message) => $message->household_id.'-'.$message->buyer_id)
            ->map(function ($messages) use ($user, $ownedProducerIds) {
                $latest = $messages->first();
                $asProducer = $ownedProducerIds->contains($latest->household_id);

                return [
                    'key' => $latest->household_id.'-'.$latest->buyer_id,
                    'as_producer' => $asProducer,
                    'title' => $asProducer ? $latest->buyer->name : $latest->producer->name,
                    'subtitle' => $asProducer ? $latest->producer->name : null,
                    'avatar_path' => $asProducer ? $latest->buyer->avatar_path : $latest->producer->logo_path,
                    'href' => $asProducer
                        ? route('messages.thread', [$latest->household_id, $latest->buyer_id])
                        : route('messages.show', $latest->producer->slug),
                    'last_message' => $latest->body,
                    'last_at' => $latest->created_at,
                    'unread' => $messages->where('sender_id', '!=', $user->id)->whereNull('read_at')->count(),
                ];
            })
            ->sortByDesc('last_at')
            ->values();

        return Inertia::render('messages/index', ['threads' => $threads]);
    }

    /**
     * Threads for the producers the authenticated user owns - the seller's
     * side of the same conversations.
     */
    public function producerInbox(Request $request): Response
    {
        $producerIds = $request->user()->producers()->pluck('id');

        $threads = ProducerMessage::query()
            ->whereIn('household_id', $producerIds)
            ->with(['producer:id,name,slug', 'buyer:id,name,avatar_path'])
            ->latest()
            ->latest('id')
            ->get()
            ->groupBy(fn (ProducerMessage $message) => $message->household_id.'-'.$message->buyer_id)
            ->map(fn ($messages) => [
                'producer' => $messages->first()->producer,
                'buyer' => $messages->first()->buyer,
                'last_message' => $messages->first()->body,
                'last_at' => $messages->first()->created_at,
                'unread' => $messages->where('sender_id', '!=', $request->user()->id)->whereNull('read_at')->count(),
            ])
            ->values();

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

        ProducerMessage::create([
            'household_id' => $producer->id,
            'buyer_id' => $buyer->id,
            'sender_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        return back();
    }
}
