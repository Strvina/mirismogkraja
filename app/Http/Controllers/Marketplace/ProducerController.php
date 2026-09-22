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
     * List active producers, optionally filtered by city, with everything
     * their card shows (task 13): rating, review count and the latest few
     * reviews with their authors.
     */
    public function index(Request $request): Response
    {
        $producers = Producer::query()
            ->where('status', 'active')
            ->when($request->string('city')->toString(), fn ($query, $city) => $query->where('city', $city))
            ->withAvg('reviews', 'rating')
            ->withCount(['reviews', 'products' => fn ($query) => $query->where('status', 'active')])
            ->with(['reviews' => fn ($query) => $query->latest()->limit(2)->with('user:id,name,avatar_path')])
            ->orderBy('name')
            ->paginate(12)
            ->withQueryString();

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

        $user = request()->user();

        return Inertia::render('marketplace/producers/show', [
            'producer' => $producer,
            'gallery' => $producer->images()->get(['id', 'path', 'caption']),
            'products' => $producer->products()->where('status', 'active')->with('images')->get(),
            'reviews' => $producer->reviews()->with('user:id,name,avatar_path')->latest()->paginate(10)->withQueryString(),
            'averageRating' => round($producer->reviews()->avg('rating') ?? 0, 1),
            'canReview' => $user?->can('create', [Review::class, $producer]) ?? false,
            // The owner has no one to message on their own page; everyone
            // else signed in can open a thread with this producer.
            'canMessage' => $user !== null && $producer->user_id !== $user->id,
            'isFavorited' => $user?->favorites()
                ->where('favoritable_type', 'household')
                ->where('favoritable_id', $producer->id)
                ->exists() ?? false,
        ]);
    }
}
