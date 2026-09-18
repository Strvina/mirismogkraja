<?php

namespace App\Http\Controllers\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\Producer;
use App\Models\Review;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProducerController extends Controller
{
    /**
     * List active producers, optionally filtered by city. There's no
     * category filter yet - categories classify Products (docs/database.md),
     * not Producers, and Product doesn't exist until Faza 3.
     */
    public function index(Request $request): Response
    {
        $producers = Producer::query()
            ->where('status', 'active')
            ->when($request->string('city')->toString(), fn ($query, $city) => $query->where('city', $city))
            ->orderBy('name')
            ->get();

        $cities = Producer::query()
            ->where('status', 'active')
            ->whereNotNull('city')
            ->distinct()
            ->orderBy('city')
            ->pluck('city');

        return Inertia::render('marketplace/producers/index', [
            'producers' => $producers,
            'cities' => $cities,
            'filters' => ['city' => $request->string('city')->toString() ?: null],
        ]);
    }

    /**
     * Show a producer's public page. Only 'active' producers (approved by
     * an admin, task 2.6) are publicly visible - pending/blocked ones 404.
     */
    public function show(Producer $producer): Response
    {
        if ($producer->status !== 'active') {
            throw new NotFoundHttpException;
        }

        return Inertia::render('marketplace/producers/show', [
            'producer' => $producer,
            'products' => $producer->products()->where('status', 'active')->with('images')->get(),
            'reviews' => $producer->reviews()->with('user:id,name')->latest()->get(),
            'averageRating' => round($producer->reviews()->avg('rating') ?? 0, 1),
            'canReview' => request()->user()?->can('create', [Review::class, $producer]) ?? false,
            'isFavorited' => request()->user()?->favorites()
                ->where('favoritable_type', 'household')
                ->where('favoritable_id', $producer->id)
                ->exists() ?? false,
        ]);
    }
}
