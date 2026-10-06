<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreWantedAdRequest;
use App\Models\Category;
use App\Models\Producer;
use App\Models\WantedAd;
use App\Services\WantedAdService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * A buyer's own "Tražim" ads - writing one, closing it, deleting it - and a
 * producer's answer to someone else's. Reading them is
 * Marketplace\WantedAdController.
 */
class WantedAdController extends Controller
{
    public function create(Request $request): Response
    {
        return Inertia::render('wanted/create', [
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            // Where the buyer is, as a starting point they can change.
            'city' => $request->user()->city,
            // What the search that led here was for, when it found nothing.
            'suggestedTitle' => str($request->string('q')->toString())->squish()->limit(120, '')->toString(),
            'bodyMax' => WantedAd::BODY_MAX,
            'daysOpen' => WantedAd::DAYS_OPEN,
        ]);
    }

    public function store(StoreWantedAdRequest $request, WantedAdService $ads): RedirectResponse
    {
        $ad = $ads->create($request->user(), $request->validated());

        return to_route('wanted.show', $ad)->with('status', __('Oglas je objavljen. Javićemo proizvođačima koji prodaju u toj kategoriji.'));
    }

    public function close(WantedAd $ad, WantedAdService $ads): RedirectResponse
    {
        $this->authorize('update', $ad);

        $ads->close($ad);

        return back()->with('status', __('Oglas je zatvoren.'));
    }

    public function destroy(WantedAd $ad): RedirectResponse
    {
        $this->authorize('update', $ad);

        $ad->delete();

        return to_route('wanted.index')->with('status', __('Oglas je obrisan.'));
    }

    /** A producer answers: straight into the conversation with the buyer. */
    public function respond(Request $request, WantedAd $ad, WantedAdService $ads): RedirectResponse
    {
        $data = $request->validate([
            'producer_id' => ['required', 'integer'],
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $producer = Producer::findOrFail($data['producer_id']);
        $this->authorize('respond', [$ad, $producer]);

        $ads->respond($ad, $producer, $data['body']);

        return to_route('messages.thread', [$producer->id, $ad->user_id]);
    }
}
