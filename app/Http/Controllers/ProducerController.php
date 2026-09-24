<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProducerRequest;
use App\Http\Requests\UpdateProducerRequest;
use App\Models\Producer;
use App\Models\ProducerChangeRequest;
use App\Services\FoundingProducerService;
use App\Services\ProducerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProducerController extends Controller
{
    /**
     * List the authenticated user's own producers.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Producer::class);

        return Inertia::render('producers/index', [
            'producers' => $request->user()->producers()->latest()->get(),
            // A rename of a published producer waits for an admin, so the
            // list says so - otherwise the name simply not changing reads as
            // the save having failed.
            'pendingChanges' => ProducerChangeRequest::pending()
                ->whereIn('household_id', $request->user()->producers()->pluck('id'))
                ->get(['id', 'household_id', 'field', 'requested_value']),
        ]);
    }

    /**
     * Show the form for creating a producer.
     */
    public function create(FoundingProducerService $founding): Response
    {
        $this->authorize('create', Producer::class);

        return Inertia::render('producers/create', [
            // The launch offer only means something if people can see it
            // running out (task 20.4).
            'founding' => [
                'claimed' => $founding->claimed(),
                'limit' => FoundingProducerService::LIMIT,
                'remaining' => $founding->remaining(),
            ],
        ]);
    }

    /**
     * Create a producer owned by the authenticated user.
     */
    public function store(StoreProducerRequest $request, ProducerService $producers): RedirectResponse
    {
        $producers->create(
            $request->user(),
            $request->safe()->except(['cover_image', 'logo']),
            $request->file('cover_image'),
            $request->file('logo'),
        );

        return to_route('producers.index');
    }

    /**
     * Show the form for editing the producer.
     */
    public function edit(Producer $producer): Response
    {
        $this->authorize('update', $producer);

        return Inertia::render('producers/edit', [
            'producer' => $producer,
            'gallery' => $producer->images()->get(['id', 'path', 'caption']),
        ]);
    }

    /**
     * Update the producer.
     */
    public function update(UpdateProducerRequest $request, Producer $producer, ProducerService $producers): RedirectResponse
    {
        $producers->update(
            $producer,
            $request->safe()->except(['cover_image', 'logo']),
            $request->file('cover_image'),
            $request->file('logo'),
        );

        return to_route('producers.index');
    }

    /**
     * Delete the producer.
     */
    public function destroy(Producer $producer): RedirectResponse
    {
        $this->authorize('delete', $producer);

        $producer->delete();

        return to_route('producers.index');
    }
}
