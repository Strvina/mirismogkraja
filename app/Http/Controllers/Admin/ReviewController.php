<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReviewController extends Controller
{
    /**
     * The moderation queue. It opens on the reviews that still need a
     * decision, because those are the only ones holding anything up; the
     * other two tabs are there to review past decisions and undo a wrong
     * one.
     */
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();

        if (! in_array($status, [Review::STATUS_PENDING, Review::STATUS_APPROVED, Review::STATUS_REJECTED], true)) {
            $status = Review::STATUS_PENDING;
        }

        return Inertia::render('admin/reviews/index', [
            'reviews' => Review::with(['user:id,name', 'producer:id,name,slug'])
                ->where('status', $status)
                ->orderByDesc('created_at')
                ->get(),
            'filters' => ['status' => $status],
            'counts' => [
                Review::STATUS_PENDING => Review::where('status', Review::STATUS_PENDING)->count(),
                Review::STATUS_APPROVED => Review::where('status', Review::STATUS_APPROVED)->count(),
                Review::STATUS_REJECTED => Review::where('status', Review::STATUS_REJECTED)->count(),
            ],
        ]);
    }

    /**
     * Publish a review, stamping when it went up - that's what the public
     * page's "pre 2 dana" counts from. Approving one that is already
     * approved leaves its existing stamp alone, so a stray second click
     * doesn't shuffle it back to the top of the producer's page.
     */
    public function approve(Review $review): RedirectResponse
    {
        $review->update([
            'status' => Review::STATUS_APPROVED,
            'approved_at' => $review->approved_at ?? now(),
        ]);

        return back();
    }

    /** Keep the review on record, but off the producer's page. */
    public function reject(Review $review): RedirectResponse
    {
        $review->update([
            'status' => Review::STATUS_REJECTED,
            'approved_at' => null,
        ]);

        return back();
    }

    public function destroy(Review $review): RedirectResponse
    {
        $review->delete();

        return back();
    }
}
