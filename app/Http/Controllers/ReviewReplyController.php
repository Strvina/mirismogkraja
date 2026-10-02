<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Notifications\SiteNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * A producer's public answer under a review of them - a thank-you, or their
 * side of a complaint. One per review, editable; empty removes it. The
 * reviewer hears about the first one.
 */
class ReviewReplyController extends Controller
{
    public function update(Request $request, Review $review): RedirectResponse
    {
        $this->authorize('reply', $review);

        $data = $request->validate(['reply' => ['nullable', 'string', 'max:1000']]);
        $reply = trim((string) ($data['reply'] ?? ''));
        $isFirst = $review->reply === null && $reply !== '';

        $review->forceFill([
            'reply' => $reply !== '' ? $reply : null,
            'replied_at' => $reply !== '' ? ($review->replied_at ?? now()) : null,
        ])->save();

        if ($isFirst) {
            $review->user?->notify(SiteNotification::reviewReplied(
                $review->producer->name,
                route('marketplace.producers.show', $review->producer->slug),
            ));
        }

        return back();
    }
}
