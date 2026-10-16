<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\InquiryOutcome;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/** The list of a user's conversations, from both sides. */
class MessageInboxController extends Controller
{
    /** Conversations per page of the inbox. */
    private const THREADS_PER_PAGE = 30;

    /**
     * Every thread the user is part of, from either side: ones they started
     * as a buyer, and ones buyers started with producers they own. They're
     * listed together because a user can be both, and splitting them across
     * two pages means a seller clicking the header's message badge lands on
     * an inbox that doesn't contain the message they were notified about.
     */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $ownedProducerIds = $user->producers()->pluck('id');

        $threads = $this->threadSummaries($user, $ownedProducerIds);

        // The producer's own note on each of their threads on this page, in one query.
        $outcomes = InquiryOutcome::query()
            ->whereIn('producer_id', $ownedProducerIds)
            ->whereIn('buyer_id', $threads->getCollection()->map(fn (array $thread) => $thread['message']->buyer_id)->unique())
            ->get(['producer_id', 'buyer_id', 'status'])
            ->mapWithKeys(fn (InquiryOutcome $outcome) => [$outcome->producer_id.'-'.$outcome->buyer_id => $outcome->status]);

        $threads = $threads->through(function (array $thread) use ($ownedProducerIds, $outcomes) {
            $message = $thread['message'];
            $asProducer = $ownedProducerIds->contains($message->producer_id);
            $key = $message->producer_id.'-'.$message->buyer_id;

            return [
                'key' => $key,
                'as_producer' => $asProducer,
                // Only the producer sees it; it is their own record.
                'outcome' => $asProducer && isset($outcomes[$key]) ? __(InquiryOutcome::STATUSES[$outcomes[$key]] ?? '') : null,
                'title' => $asProducer ? $message->buyer->name : $message->producer->name,
                'subtitle' => $asProducer ? $message->producer->name : null,
                'avatar_path' => $asProducer ? $message->buyer->avatar_path : $message->producer->logo_path,
                'href' => $asProducer
                    ? route('messages.thread', [$message->producer_id, $message->buyer_id])
                    : route('messages.show', $message->producer->slug),
                'last_message' => $message->body,
                'last_at' => $message->created_at,
                'unread' => $thread['unread'],
            ];
        });

        return Inertia::render('messages/index', ['threads' => $threads]);
    }

    /**
     * The viewer's conversations, newest first, each with its last message
     * and how many of the other side's messages the viewer hasn't read: one
     * row each in `conversations`, kept current as messages are written and
     * read (see App\Models\Conversation), rather than every message the
     * viewer ever exchanged grouped on every visit.
     *
     * Paginated: a busy producer's inbox holds thousands of them, and only
     * a page is ever on screen.
     *
     * @param  Collection<int, int>  $ownedProducerIds
     * @return LengthAwarePaginator<int, array{message: ProducerMessage, unread: int}>
     */
    private function threadSummaries(User $viewer, Collection $ownedProducerIds): LengthAwarePaginator
    {
        $conversations = Conversation::query()
            ->whereNotNull('last_message_id')
            // Someone who owns no producer is only ever the buyer: no OR,
            // so the index on buyer_id answers it alone.
            ->when(
                $ownedProducerIds->isEmpty(),
                fn ($query) => $query->where('buyer_id', $viewer->id),
                fn ($query) => $query->where(fn ($inner) => $inner->where('buyer_id', $viewer->id)->orWhereIn('producer_id', $ownedProducerIds)),
            )
            ->orderByDesc('last_message_id')
            ->with(['lastMessage.producer:id,name,slug,logo_path', 'lastMessage.buyer:id,name,avatar_path'])
            ->paginate(self::THREADS_PER_PAGE);

        /** @var LengthAwarePaginator<int, array{message: ProducerMessage, unread: int}> */
        return $conversations->through(fn (Conversation $conversation) => [
            // whereNotNull above: every row here has its last message.
            'message' => $conversation->lastMessage,
            'unread' => $ownedProducerIds->contains($conversation->producer_id) ? $conversation->unread_by_producer : $conversation->unread_by_buyer,
        ]);
    }
}
