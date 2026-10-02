<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\Review;
use App\Notifications\SiteNotification;
use App\Support\Admins;
use App\Support\Media;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /**
     * A new review is never published straight away: it's stored as pending
     * and only an admin's approval puts it on the producer's page. The
     * author is told as much on the way back, so the review not appearing
     * doesn't read as a failed submission.
     */
    public function store(Request $request, Producer $producer): RedirectResponse
    {
        $this->authorize('create', [Review::class, $producer]);

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
            'image' => ['nullable', 'image', 'max:4096'],
        ]);

        // One row per (user, producer) is a database constraint, so a
        // previously rejected review of the same producer makes way for this
        // one. Its photo goes with it, through the model's own cleanup.
        $producer->reviews()
            ->where('user_id', $request->user()->id)
            ->where('status', Review::STATUS_REJECTED)
            ->get()
            ->each
            ->delete();

        $review = $producer->reviews()->create([
            'user_id' => $request->user()->id,
            'rating' => $data['rating'],
            'comment' => $data['comment'] ?? null,
            'image_path' => $request->hasFile('image') ? Media::store($request->file('image'), 'reviews') : null,
            'status' => Review::STATUS_PENDING,
        ]);

        $producer->user?->notify(SiteNotification::reviewReceived(
            $producer->name,
            route('marketplace.producers.show', $producer->slug),
        ));
        Admins::notify(SiteNotification::forAdmins('review-pending', [
            'producer' => $producer->name,
            'rating' => $review->rating,
        ], route('admin.reviews.index')));

        return back()->with('status', __('Hvala! Vaš utisak čeka odobrenje i biće objavljen uskoro.'))
            ->with('reviewId', $review->id);
    }

    public function destroy(Review $review): RedirectResponse
    {
        $this->authorize('delete', $review);

        if ($review->image_path) {
            Media::delete($review->image_path);
        }

        $review->delete();

        return back();
    }
}
