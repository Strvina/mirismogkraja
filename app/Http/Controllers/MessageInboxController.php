<?php

namespace App\Http\Controllers;

use App\Models\InquiryOutcome;
use App\Services\Messaging;
use Illuminate\Http\Request;
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
    public function __invoke(Request $request, Messaging $messaging): Response
    {
        $user = $request->user();
        $ownedProducerIds = $user->producers()->pluck('id');

        $threads = $messaging->summaries($user, $ownedProducerIds, self::THREADS_PER_PAGE);

        // The producer's own note on each of their threads on this page, in one query.
        $outcomes = InquiryOutcome::query()
            ->whereIn('producer_id', $ownedProducerIds)
            ->whereIn('buyer_id', $threads->getCollection()->pluck('buyer_id')->unique())
            ->get(['producer_id', 'buyer_id', 'status'])
            ->mapWithKeys(fn (InquiryOutcome $outcome) => [$outcome->producer_id.'-'.$outcome->buyer_id => $outcome->status]);

        // Only the producer sees it; it is their own record.
        $threads = $threads->through(fn (array $thread) => [
            ...$thread,
            'outcome' => $thread['as_producer'] && isset($outcomes[$thread['key']]) ? __(InquiryOutcome::STATUSES[$outcomes[$thread['key']]] ?? '') : null,
        ]);

        return Inertia::render('messages/index', ['threads' => $threads]);
    }
}
