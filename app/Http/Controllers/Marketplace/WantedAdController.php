<?php

namespace App\Http\Controllers\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\WantedAd;
use App\Models\WantedAdResponse;
use App\Support\PageMeta;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "Tražim": what buyers are looking for, for anyone to read and for
 * producers to answer. Only what the page prints leaves the server - the
 * author is a first name, never an account.
 */
class WantedAdController extends Controller
{
    private const PER_PAGE = 20;

    public function index(Request $request): Response
    {
        abort_if($request->integer('page') > ProductController::MAX_PAGE, 404);

        $categoryId = $request->integer('kategorija');
        $city = $request->string('mesto')->toString();
        $user = $request->user();

        return Inertia::render('wanted/index', [
            'meta' => PageMeta::make(
                __('Tražim | Vrelina juga'),
                __('Kupci pišu šta traže, a domaći proizvođači im se javljaju. Napišite i vi šta vam treba.'),
            ),
            'ads' => WantedAd::listed()
                ->with(['user:id,name,blocked_at', 'category:id,name'])
                ->withCount('responses')
                ->when($categoryId, fn ($query) => $query->where('category_id', $categoryId))
                ->when($city !== '', fn ($query) => $query->where('city', $city))
                ->latest()
                ->paginate(self::PER_PAGE)
                ->withQueryString()
                ->through(fn (WantedAd $ad) => $this->card($ad)),
            // The reader's own, whatever state they are in.
            'mine' => $user === null ? [] : $user->wantedAds()
                ->with(['user:id,name,blocked_at', 'category:id,name'])
                ->withCount('responses')
                ->latest()
                ->limit(10)
                ->get()
                ->map(fn (WantedAd $ad) => [...$this->card($ad), 'state' => $this->state($ad)]),
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'cities' => WantedAd::listed()->whereNotNull('city')->distinct()->orderBy('city')->pluck('city'),
            'filters' => ['kategorija' => $categoryId ?: null, 'mesto' => $city !== '' ? $city : null],
        ]);
    }

    public function show(Request $request, WantedAd $ad): Response
    {
        $ad->load(['user:id,name,blocked_at', 'category:id,name'])->loadCount('responses');

        $user = $request->user();
        $isAuthor = $user !== null && $user->id === $ad->user_id;

        // The author sees their own ad in any state, and an admin what they
        // are deciding about; nobody else reaches one that is not listed.
        abort_unless($ad->isListed() || $isAuthor || $user?->hasRole('admin'), 404);

        // The producers the reader could answer as, and which already have.
        $producers = $user === null || $isAuthor
            ? collect()
            : $user->producers()->where('status', 'active')->get(['id', 'name']);

        $answered = WantedAdResponse::where('wanted_ad_id', $ad->id)
            ->whereIn('producer_id', $producers->pluck('id'))
            ->pluck('producer_id');

        return Inertia::render('wanted/show', [
            'meta' => PageMeta::make(__(':title | Tražim', ['title' => $ad->title]), $ad->body),
            'ad' => [
                ...$this->card($ad),
                'body' => $ad->body,
                'state' => $this->state($ad),
                'expires_at' => $ad->expires_at,
            ],
            'isAuthor' => $isAuthor,
            // Who has answered, for the author only: each is a conversation
            // already waiting in their messages.
            'responders' => $isAuthor
                ? $ad->responses()->with('producer:id,name,slug,city,logo_path')->latest()->get()
                    ->filter(fn (WantedAdResponse $response) => $response->producer !== null)
                    ->map(fn (WantedAdResponse $response) => $response->producer->only(['id', 'name', 'slug', 'city', 'logo_path']))
                    ->values()
                : [],
            'producers' => $producers->map(fn ($producer) => [
                'id' => $producer->id,
                'name' => $producer->name,
                'answered' => $answered->contains($producer->id),
            ]),
            'canRespond' => $ad->isListed() && $producers->isNotEmpty(),
        ]);
    }

    /**
     * What a list shows of an ad.
     *
     * @return array<string, mixed>
     */
    private function card(WantedAd $ad): array
    {
        return [
            'id' => $ad->id,
            'title' => $ad->title,
            'excerpt' => Str::limit(Str::squish($ad->body), 220),
            'quantity' => $ad->quantity,
            'city' => $ad->city,
            'category' => $ad->category?->name,
            'author' => $ad->authorName(),
            'created_at' => $ad->created_at,
            'responses_count' => $ad->responses_count,
        ];
    }

    /** Where an ad stands, for its author: open, expired, closed or blocked. */
    private function state(WantedAd $ad): string
    {
        return $ad->status === WantedAd::STATUS_OPEN && $ad->expires_at->isPast() ? 'expired' : $ad->status;
    }
}
