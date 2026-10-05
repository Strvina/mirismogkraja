<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\ProducerMarket;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** "Gde me nađete": the owner's list of places they sell at in person. */
class ProducerMarketController extends Controller
{
    public function index(Producer $producer): Response
    {
        $this->authorize('update', $producer);

        return Inertia::render('producers/markets', [
            'producer' => $producer->only(['id', 'name', 'slug', 'status']),
            'markets' => $producer->markets()->get(ProducerMarket::PUBLIC_COLUMNS),
            'limit' => ProducerMarket::MAX_PER_PRODUCER,
        ]);
    }

    public function store(Request $request, Producer $producer): RedirectResponse
    {
        $this->authorize('update', $producer);

        if ($producer->markets()->count() >= ProducerMarket::MAX_PER_PRODUCER) {
            throw ValidationException::withMessages([
                'name' => __('Možete uneti najviše :max mesta.', ['max' => ProducerMarket::MAX_PER_PRODUCER]),
            ]);
        }

        $producer->markets()->create($this->validated($request));

        return back();
    }

    public function update(Request $request, Producer $producer, ProducerMarket $market): RedirectResponse
    {
        $this->authorize('update', $producer);
        abort_unless($market->producer_id === $producer->id, 404);

        $market->update($this->validated($request));

        return back();
    }

    public function destroy(Producer $producer, ProducerMarket $market): RedirectResponse
    {
        $this->authorize('update', $producer);
        abort_unless($market->producer_id === $producer->id, 404);

        $market->delete();

        return back();
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:80'],
            'days' => ['required', 'array', 'min:1', 'max:7'],
            'days.*' => ['integer', 'between:1,7', 'distinct'],
            // Both or neither: "od 7" without an end says little.
            'opens_at' => ['nullable', 'date_format:H:i', 'required_with:closes_at'],
            'closes_at' => ['nullable', 'date_format:H:i', 'required_with:opens_at', 'after:opens_at'],
            'note' => ['nullable', 'string', 'max:160'],
        ], [
            'days.required' => __('Izaberite bar jedan dan.'),
            'closes_at.after' => __('Kraj mora biti posle početka.'),
        ]);

        // In week order, whatever order the boxes were ticked in.
        $data['days'] = collect($data['days'])->map(fn ($day) => (int) $day)->sort()->values()->all();

        return $data;
    }
}
