<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Producer;
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
    public function updateStatus(Request $request, Producer $producer): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', 'in:pending,active,blocked']]);

        $producer->update($data);

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
