<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WantedAd;
use App\Services\WantedAdService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "Tražim" ads go up without waiting, like stories; this is where an admin
 * reads them afterwards and takes down what should not be there.
 */
class WantedAdController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();
        $status = in_array($status, WantedAd::STATUSES, true) ? $status : null;

        return Inertia::render('admin/wanted/index', [
            'ads' => WantedAd::query()
                // An ad outlives its author's account in this list.
                ->with(['user' => fn ($user) => $user->withTrashed()->select('id', 'name'), 'category:id,name'])
                ->withCount('responses')
                ->when($status, fn ($query) => $query->where('status', $status))
                ->latest()
                ->paginate(30)
                ->withQueryString()
                ->through(fn (WantedAd $ad) => [
                    ...$ad->only(['id', 'title', 'body', 'quantity', 'city', 'status', 'created_at', 'expires_at', 'responses_count']),
                    'category' => $ad->category?->name,
                    'author' => $ad->user?->name,
                ]),
            'filters' => ['status' => $status],
            'counts' => WantedAd::countsByStatus(),
        ]);
    }

    /** Take an ad down, or put a blocked one back up. */
    public function updateStatus(Request $request, WantedAd $ad, WantedAdService $ads): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in([WantedAd::STATUS_OPEN, WantedAd::STATUS_BLOCKED])]]);

        // "Put back" undoes a block; it is not a way to reopen an ad its author closed.
        abort_if($data['status'] === WantedAd::STATUS_OPEN && $ad->status !== WantedAd::STATUS_BLOCKED, 422);

        $ads->moderate($ad, $data['status']);

        return back();
    }

    public function destroy(WantedAd $ad): RedirectResponse
    {
        $ad->delete();

        return back();
    }
}
