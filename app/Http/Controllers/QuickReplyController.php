<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\QuickReply;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** A producer's saved answers: managed here, used from the message box. */
class QuickReplyController extends Controller
{
    public function index(Producer $producer): Response
    {
        $this->authorize('update', $producer);

        return Inertia::render('producers/quick-replies', [
            'producer' => $producer->only(['id', 'name']),
            'replies' => $producer->quickReplies()->get(['id', 'title', 'body']),
            'limit' => QuickReply::MAX_PER_PRODUCER,
            'bodyMax' => QuickReply::BODY_MAX,
        ]);
    }

    public function store(Request $request, Producer $producer): RedirectResponse
    {
        $this->authorize('update', $producer);

        if ($producer->quickReplies()->count() >= QuickReply::MAX_PER_PRODUCER) {
            throw ValidationException::withMessages([
                'title' => __('Možete sačuvati najviše :max brzih odgovora.', ['max' => QuickReply::MAX_PER_PRODUCER]),
            ]);
        }

        $producer->quickReplies()->create($this->validated($request));

        return back();
    }

    /** The suggested answers, for a producer who has none yet. */
    public function storeStarters(Producer $producer): RedirectResponse
    {
        $this->authorize('update', $producer);

        // Only into an empty list: pressed twice, it must not double them.
        if (! $producer->quickReplies()->exists()) {
            foreach (QuickReply::STARTERS as $title => $body) {
                $producer->quickReplies()->create(['title' => __($title), 'body' => __($body)]);
            }
        }

        return back();
    }

    public function update(Request $request, Producer $producer, QuickReply $reply): RedirectResponse
    {
        $this->authorize('update', $producer);
        abort_unless($reply->producer_id === $producer->id, 404);

        $reply->update($this->validated($request));

        return back();
    }

    public function destroy(Producer $producer, QuickReply $reply): RedirectResponse
    {
        $this->authorize('update', $producer);
        abort_unless($reply->producer_id === $producer->id, 404);

        $reply->delete();

        return back();
    }

    /** @return array{title: string, body: string} */
    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:60'],
            'body' => ['required', 'string', 'max:'.QuickReply::BODY_MAX],
        ]);
    }
}
