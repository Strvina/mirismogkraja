<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\Review;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function store(Request $request, Producer $producer): RedirectResponse
    {
        $this->authorize('create', [Review::class, $producer]);

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $producer->reviews()->create([
            'user_id' => $request->user()->id,
            ...$data,
        ]);

        return back();
    }

    public function destroy(Review $review): RedirectResponse
    {
        $this->authorize('delete', $review);

        $review->delete();

        return back();
    }
}
