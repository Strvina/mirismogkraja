<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProducerRequest;
use App\Http\Requests\UpdateProducerRequest;
use App\Models\Category;
use App\Models\Producer;
use App\Models\ProducerChangeRequest;
use App\Notifications\SiteNotification;
use App\Services\FoundingProducerService;
use App\Services\ProducerPosterPdf;
use App\Services\ProducerService;
use App\Support\Admins;
use App\Support\ProfileCompleteness;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
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
            'producers' => $request->user()->producers()
                ->withCount(['images', 'products as active_products_count' => fn ($products) => $products->where('status', 'active')])
                ->latest()
                ->get()
                // What would make each page more convincing to a buyer.
                ->each(fn (Producer $producer) => $producer->setAttribute('completeness', ProfileCompleteness::for($producer))),
            // A rename of a published producer waits for an admin, so the
            // list says so - otherwise the name simply not changing reads as
            // the save having failed.
            'pendingChanges' => ProducerChangeRequest::pending()
                ->whereIn('producer_id', $request->user()->producers()->pluck('id'))
                ->get(['id', 'producer_id', 'field', 'requested_value']),
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
            // running out.
            'founding' => [
                'claimed' => $founding->claimed(),
                'limit' => $founding->limit(),
                'remaining' => $founding->remaining(),
            ],
            // For the wizard's products step.
            'categories' => Category::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Create a producer owned by the authenticated user.
     */
    public function store(StoreProducerRequest $request, ProducerService $producers): RedirectResponse
    {
        $producer = $producers->create(
            $request->user(),
            $request->safe()->except(['cover_image', 'logo', 'products']),
            $request->file('cover_image'),
            $request->file('logo'),
            // Rows and their photos, matched by position.
            collect($request->validated('products', []))
                ->map(fn (array $product, int $index) => [...$product, 'image' => $request->file("products.{$index}.image")])
                ->all(),
        );

        Admins::notify(SiteNotification::forAdmins('producer-pending', [
            'producer' => $producer->name,
            'city' => $producer->city ?: '—',
        ], route('admin.producers.index', ['status' => 'pending'])));

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

    /**
     * The printable stall poster with the producer's QR code. Only for a
     * producer the public can see: the code would otherwise open a 404.
     */
    public function poster(Producer $producer, ProducerPosterPdf $poster): HttpResponse
    {
        $this->authorize('update', $producer);
        abort_unless($producer->status === 'active', 403, __('Poster je dostupan kada proizvođač bude odobren.'));

        return response($poster->render($producer), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$poster->filenameFor($producer).'"',
        ]);
    }
}
