<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\Review;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ReviewController extends Controller
{
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
        ]);

        return back();
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
