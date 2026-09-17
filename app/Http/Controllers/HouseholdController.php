<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreHouseholdRequest;
use App\Http\Requests\UpdateHouseholdRequest;
use App\Models\Household;
use App\Services\HouseholdService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HouseholdController extends Controller
{
    /**
     * List the authenticated user's own households.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Household::class);

        return Inertia::render('households/index', [
            'households' => $request->user()->households()->latest()->get(),
        ]);
    }

    /**
     * Show the form for creating a household.
     */
    public function create(): Response
    {
        $this->authorize('create', Household::class);

        return Inertia::render('households/create');
    }

    /**
     * Create a household owned by the authenticated user.
     */
    public function store(StoreHouseholdRequest $request, HouseholdService $households): RedirectResponse
    {
        $households->create(
            $request->user(),
            $request->safe()->except(['cover_image', 'logo']),
            $request->file('cover_image'),
            $request->file('logo'),
        );

        return to_route('households.index');
    }

    /**
     * Show the form for editing the household.
     */
    public function edit(Household $household): Response
    {
        $this->authorize('update', $household);

        return Inertia::render('households/edit', ['household' => $household]);
    }

    /**
     * Update the household.
     */
    public function update(UpdateHouseholdRequest $request, Household $household, HouseholdService $households): RedirectResponse
    {
        $households->update(
            $household,
            $request->safe()->except(['cover_image', 'logo']),
            $request->file('cover_image'),
            $request->file('logo'),
        );

        return to_route('households.index');
    }

    /**
     * Delete the household.
     */
    public function destroy(Household $household): RedirectResponse
    {
        $this->authorize('delete', $household);

        $household->delete();

        return to_route('households.index');
    }
}
