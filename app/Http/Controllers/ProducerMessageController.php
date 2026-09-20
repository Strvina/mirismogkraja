<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProducerMessageController extends Controller
{
    /**
     * A buyer's own threads, one per producer they've written to (task 8).
     */
    public function index(Request $request): Response
    {
        $threads = ProducerMessage::query()
            ->where('buyer_id', $request->user()->id)
            ->with('producer:id,name,slug,logo_path')
            // id breaks the tie: two messages can share a created_at second.
            ->latest()
            ->latest('id')
            ->get()
            ->groupBy('household_id')
            ->map(fn ($messages) => [
                'producer' => $messages->first()->producer,
                'last_message' => $messages->first()->body,
                'last_at' => $messages->first()->created_at,
                'unread' => $messages->where('sender_id', '!=', $request->user()->id)->whereNull('read_at')->count(),
            ])
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
            'messages' => ProducerMessage::thread($producer, $buyer)
                ->with('sender:id,name,avatar_path')
                ->oldest()
                ->get()
                ->map(fn (ProducerMessage $message) => [
                    'id' => $message->id,
                    'body' => $message->body,
                    'created_at' => $message->created_at,
                    'mine' => $message->sender_id === $request->user()->id,
                    'sender' => $message->sender->only(['id', 'name', 'avatar_path']),
                ]),
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
