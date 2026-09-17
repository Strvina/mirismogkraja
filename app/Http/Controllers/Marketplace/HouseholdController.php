<?php

namespace App\Http\Controllers\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\Household;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class HouseholdController extends Controller
{
    /**
     * List active households, optionally filtered by city. There's no
     * category filter yet - categories classify Products (docs/database.md),
     * not Households, and Product doesn't exist until Faza 3.
     */
    public function index(Request $request): Response
    {
        $households = Household::query()
            ->where('status', 'active')
            ->when($request->string('city')->toString(), fn ($query, $city) => $query->where('city', $city))
            ->orderBy('name')
            ->get();

        $cities = Household::query()
            ->where('status', 'active')
            ->whereNotNull('city')
            ->distinct()
            ->orderBy('city')
            ->pluck('city');

        return Inertia::render('marketplace/households/index', [
            'households' => $households,
            'cities' => $cities,
            'filters' => ['city' => $request->string('city')->toString() ?: null],
        ]);
    }

    /**
     * Show a household's public page. Only 'active' households (approved by
     * an admin, task 2.6) are publicly visible - pending/blocked ones 404.
     */
    public function show(Household $household): Response
    {
        if ($household->status !== 'active') {
            throw new NotFoundHttpException;
        }

        return Inertia::render('marketplace/households/show', [
            'household' => $household,
            // Products and reviews are wired in once those models exist
            // (task 3.3 and task 5.1).
        ]);
    }
}
