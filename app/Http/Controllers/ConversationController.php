<?php

namespace App\Http\Controllers;

use App\Models\InquiryOutcome;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * A conversation as a whole: closing it (either side) and noting how it
 * ended (the producer, for their own record).
 */
class ConversationController extends Controller
{
    /**
     * The producer notes how an inquiry ended - for their own record, and
     * the admin's unverified picture of what sells. Empty clears it.
     */
    public function setOutcome(Request $request, Producer $producer, User $buyer): RedirectResponse
    {
        $this->authorize('update', $producer);
        $this->authorize('viewThread', [ProducerMessage::class, $producer, $buyer]);

        $data = $request->validate(['status' => ['nullable', Rule::in(array_keys(InquiryOutcome::STATUSES))]]);

        $thread = InquiryOutcome::where('producer_id', $producer->id)->where('buyer_id', $buyer->id);

        if (empty($data['status'])) {
            $thread->delete();

            return back();
        }

        InquiryOutcome::upsert([[
            'producer_id' => $producer->id,
            'buyer_id' => $buyer->id,
            'status' => $data['status'],
            // What the conversation was opened about, if it came from a
            // product page.
            'product_id' => ProducerMessage::thread($producer, $buyer)->whereNotNull('product_id')->oldest('id')->value('product_id'),
            'updated_at' => now(),
        ]], ['producer_id', 'buyer_id'], ['status', 'product_id', 'updated_at']);

        return back();
    }

    /**
     * Either side closes the conversation, or reopens one it closed itself.
     * A side cannot lift the other's block - that would make it meaningless.
     */
    public function toggleBlock(Request $request, Producer $producer, User $buyer): RedirectResponse
    {
        $this->authorize('viewThread', [ProducerMessage::class, $producer, $buyer]);

        $side = $producer->user_id === $request->user()->id ? 'producer' : 'buyer';
        $blockedBy = $producer->blockedBy($buyer);

        if ($blockedBy === null) {
            $producer->blockedBuyers()->attach($buyer->id, ['blocked_by' => $side]);
        } else {
            abort_unless($blockedBy === $side, 403);
            $producer->blockedBuyers()->detach($buyer->id);
        }

        return back();
    }
}
