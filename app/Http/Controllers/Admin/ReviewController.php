<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ReviewController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/reviews/index', [
            'reviews' => Review::with(['user:id,name', 'household:id,name'])->orderByDesc('created_at')->get(),
        ]);
    }

    public function destroy(Review $review): RedirectResponse
    {
        $review->delete();

        return back();
    }
}
