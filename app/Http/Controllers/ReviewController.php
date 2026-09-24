<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\Review;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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

        $producer->reviews()->create([
            'user_id' => $request->user()->id,
            'rating' => $data['rating'],
            'comment' => $data['comment'] ?? null,
            'image_path' => $request->file('image')?->store('reviews', 'public'),
            'status' => Review::STATUS_PENDING,
        ]);

        return back()->with('status', 'Hvala! Vaš utisak čeka odobrenje i biće objavljen uskoro.');
    }

    public function destroy(Review $review): RedirectResponse
    {
        $this->authorize('delete', $review);

        if ($review->image_path) {
            Storage::disk('public')->delete($review->image_path);
        }

        $review->delete();

        return back();
    }
}
