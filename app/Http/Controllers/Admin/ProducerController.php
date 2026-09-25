<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Producer;
use App\Notifications\SiteNotification;
use App\Services\FoundingProducerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProducerController extends Controller
{
    public function index(Request $request): Response
    {
        $producers = Producer::query()
            // The owner may have archived their account, and the listing still
            // has to say whose producer this was.
            ->with(['user' => fn ($query) => $query->withTrashed()->select('id', 'name', 'email')])
            ->withCount('products')
            ->when($request->string('status')->toString(), fn ($query, $status) => $query->where('status', $status))
            // Applications waiting on a decision come first.
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('admin/producers/index', [
            'producers' => $producers,
            'pendingCount' => Producer::where('status', 'pending')->count(),
            'filters' => $request->only('status'),
        ]);
    }

    /**
     * Admin sets a producer's status directly (approve pending -> active,
     * or block/unblock) - bypasses ProducerPolicy's owner-only rules.
     */
    public function updateStatus(Request $request, Producer $producer, FoundingProducerService $founding): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', 'in:pending,active,blocked']]);

        $previous = $producer->status;
        $producer->update($data);

        // The founding hundred are counted from approval, so a request that
        // is never approved does not use up a place (task 20.4).
        if ($producer->status === 'active') {
            $founding->claimNumberFor($producer);
        }

        // Only on an actual change, so re-saving the same status doesn't
        // notify the owner again.
        if ($previous !== $producer->status && $producer->user) {
            $url = route('marketplace.producers.show', $producer->slug);

            if ($producer->status === 'active') {
                $producer->user->notify(SiteNotification::producerApproved($producer->name, $url));
            }

            if ($producer->status === 'blocked') {
                $producer->user->notify(SiteNotification::producerBlocked($producer->name, route('producers.index')));
            }
        }

        return back();
    }

    /**
     * Mark a producer as checked, or take that mark away (task 21). Done by
     * hand, after an admin has seen who they actually are - the badge is
     * only worth something if nothing awards it automatically.
     */
    public function updateVerification(Request $request, Producer $producer): RedirectResponse
    {
        $data = $request->validate(['verified' => ['required', 'boolean']]);

        $producer->update(['verified_at' => $data['verified'] ? now() : null]);

        if ($data['verified']) {
            $producer->user?->notify(SiteNotification::producerVerified(
                $producer->name,
                route('marketplace.producers.show', $producer->slug),
            ));
        }

        return back();
    }

    /**
     * Admins can correct a producer's details before or after approving them
     * (task 14, point 2), which the owner-only ProducerPolicy wouldn't allow.
     */
    public function update(Request $request, Producer $producer): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $producer->update($data);

        return back();
    }
}
