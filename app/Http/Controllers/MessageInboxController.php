<?php

namespace App\Http\Controllers;

use App\Models\InquiryOutcome;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\User;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
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

        $threads = $this->threadSummaries(
            $user,
            fn ($query) => $query->where(fn ($inner) => $inner
                ->where('buyer_id', $user->id)
                ->orWhereIn('producer_id', $ownedProducerIds))
        );

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
     * A thread is a (producer, buyer) pair rather than a table of its own, so
     * its summary is aggregated in one grouped query: the id of its newest
     * message and how many of them the viewer hasn't read. Using max(id) -
     * not max(created_at) - makes "last message" unambiguous when a reply
     * lands in the same second as the message it answers, and it keeps the
     * whole inbox to two queries instead of loading every message of every
     * conversation into memory.
     *
     * Paginated, newest conversation first: a busy producer's inbox holds
     * thousands of them, and only a page is ever on screen.
     *
     * @param  Closure(Builder<ProducerMessage>): mixed  $scope
     * @return LengthAwarePaginator<int, array{message: ProducerMessage, unread: int}>
     */
    private function threadSummaries(User $viewer, Closure $scope): LengthAwarePaginator
    {
        $aggregates = ProducerMessage::query()
            ->tap($scope)
            ->selectRaw('max(id) as last_message_id')
            ->selectRaw('sum(case when sender_id != ? and read_at is null then 1 else 0 end) as unread_count', [$viewer->id])
            ->groupBy('producer_id', 'buyer_id')
            ->orderByDesc('last_message_id')
            ->paginate(self::THREADS_PER_PAGE);

        $messages = ProducerMessage::query()
            ->whereIn('id', $aggregates->pluck('last_message_id'))
            ->with(['producer:id,name,slug,logo_path', 'buyer:id,name,avatar_path'])
            ->get()
            ->keyBy('id');

        // Every id asked for above was just read from the same table; a
        // key that is not there throws, it does not come back as null.
        /** @var LengthAwarePaginator<int, array{message: ProducerMessage, unread: int}> */
        return $aggregates->through(fn ($row) => [
            'message' => $messages[$row->last_message_id],
            // SQLite hands sum() back as a string.
            'unread' => (int) $row->unread_count,
        ]);
    }
}
