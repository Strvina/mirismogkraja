<?php

namespace App\Http\Controllers\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\Boost;
use App\Models\Producer;
use App\Models\Report;
use App\Models\Review;
use App\Services\BoostService;
use App\Services\ProducerStatistics;
use App\Services\ResponseTime;
use App\Services\SubscriptionService;
use App\Support\PageMeta;
use App\Support\Search;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

use function Illuminate\Support\defer;

class ProducerController extends Controller
{
    /** Products on a producer's own page; "all of them" links to the catalogue. */
    private const PRODUCTS_SHOWN = 24;

    /**
     * List active producers, optionally filtered by city, with everything
     * their card shows (task 13): rating, review count and the latest few
     * reviews with their authors.
     */
    public function index(Request $request, SubscriptionService $subscriptions, BoostService $boosts): Response
    {
        abort_if($request->integer('page') > ProductController::MAX_PAGE, 404);

        $city = $request->string('city')->toString();
        $search = Search::clean($request->string('q')->toString());

        $producers = $this->cards($city, $search)
            ->tap(fn ($query) => Search::orderByRelevance($query, ['name', 'description'], $search))
            ->orderBy('name')
            ->paginate(12)
            ->withQueryString();

        // Paid placement lives in its own labelled row above the directory,
        // never mixed into it: the list below stays alphabetical for
        // everyone, and a visitor can always tell what was paid for. The
        // row is drawn at random from the paying producers on each visit,
        // so no single one holds the top for good (task 20.2). Premium and
        // Pro members are in it for their whole membership; anyone else for
        // the days of a boost they paid for. Filtered by city, it is the
        // regional placement of task 20.8.
        $featured = $producers->onFirstPage()
            ? $this->cards($city, $search)
                ->whereIn('id', $subscriptions->producerIdsWith('featured_section')->concat($boosts->runningIds(Boost::PROFILE))->unique()->values())
                ->inRandomOrder()
                // Enough to fill the slider on a wide screen.
                ->limit(6)
                ->get()
            : collect();

        $subscriptions->markPremium($producers->getCollection()->concat($featured));

        $cities = Producer::published()
            ->whereNotNull('city')
            ->distinct()
            ->orderBy('city')
            ->pluck('city');

        return Inertia::render('marketplace/producers/index', [
            'meta' => PageMeta::make(__('Proizvođači | Vrelina juga'), __('Upoznajte domaće proizvođače sa juga Srbije i pišite im direktno, bez posrednika.')),
            'producers' => $producers,
            'featured' => $featured,
            // Every published producer that marked a point, within the city
            // filter. Only sent when the visitor opens the map, as a partial
            // reload - the list itself never pays for it.
            'mapPoints' => Inertia::optional(fn () => Producer::published()
                ->whereNotNull('lat')
                ->whereNotNull('lng')
                ->when($city, fn ($query) => $query->where('city', $city))
                ->get(['id', 'name', 'slug', 'city', 'lat', 'lng'])
                ->map(fn (Producer $producer) => [
                    'id' => $producer->id,
                    'name' => $producer->name,
                    'subtitle' => $producer->city,
                    'href' => route('marketplace.producers.show', $producer->slug),
                    'lat' => (float) $producer->lat,
                    'lng' => (float) $producer->lng,
                ])),
            'cities' => $cities,
            'filters' => ['city' => $city ?: null, 'q' => $search !== '' ? $search : null],
        ]);
    }

    /**
     * Published producers, in the city if one is chosen, with what their
     * card shows.
     *
     * @return Builder<Producer>
     */
    private function cards(string $city, string $search = ''): Builder
    {
        return Producer::published()
            ->withCardData()
            ->when($city, fn ($query) => $query->where('city', $city))
            ->when($search !== '', fn ($query) => Search::apply($query, ['name', 'description'], $search));
    }

    /**
     * Show a producer's public page. Only 'active' producers (approved by
     * an admin, task 2.6) are publicly visible - pending/blocked ones 404.
     */
    public function show(Request $request, Producer $producer, SubscriptionService $subscriptions, ProducerStatistics $statistics, ResponseTime $responseTime): Response
    {
        if ($producer->status !== 'active') {
            throw new NotFoundHttpException;
        }

        // After the response is sent, so a visitor never waits on a counter.
        defer(fn () => $statistics->record($request, $producer, ProducerStatistics::PROFILE_VIEW));

        $user = $request->user();
        $averageRating = round((float) ($producer->reviews()->approved()->avg('rating') ?? 0), 1);

        return Inertia::render('marketplace/producers/show', [
            // What the page prints. Not the owner's account id, the stored
            // coordinates or the moderation fields.
            'producer' => [
                ...$producer->only([
                    'id', 'name', 'slug', 'description', 'story', 'address', 'city', 'contact_email',
                    'delivery_methods', 'cover_image_path', 'logo_path', 'founding_number', 'verified_at', 'lat', 'lng',
                ]),
                'has_phone' => filled($producer->phone),
            ],
            // The number itself only when a visitor clicks "Prikaži broj" (a
            // partial reload asks for it), as the privacy page promises -
            // not in every page's HTML for every crawler to collect.
            'phone' => Inertia::optional(fn () => $producer->phone),
            'meta' => [
                ...PageMeta::make(
                    $producer->city ? "{$producer->name} - {$producer->city}" : $producer->name,
                    $producer->description,
                    $producer->cover_image_path ?? $producer->logo_path,
                    'profile',
                ),
                'structured' => PageMeta::producer($producer, $averageRating, $reviewCount = $producer->reviews()->approved()->count()),
            ],
            'isPremium' => $subscriptions->hasFeature($producer, 'premium_badge'),
            'responseTime' => $responseTime->bucketFor($producer),
            'gallery' => $producer->images()->get(['id', 'path', 'caption']),
            // The newest few; the rest are one click away in the catalogue,
            // filtered to this producer.
            'products' => $producer->products()
                ->where('status', 'active')
                ->select(['id', 'household_id', 'name', 'slug', 'price', 'unit', 'season_from', 'season_to'])
                ->with('images:id,product_id,path,order')
                ->latest()
                ->limit(self::PRODUCTS_SHOWN)
                ->get(),
            'productsCount' => $producer->products()->where('status', 'active')->count(),
            // Ordered and stamped by when they were written, not by when a
            // moderator got to them: the date on a review is the day its
            // author had the experience.
            'reviews' => $producer->reviews()->approved()
                ->with('user:id,name,avatar_path')
                ->latest()
                ->paginate(10)
                ->withQueryString(),
            'averageRating' => $averageRating,
            'canReview' => $user?->can('create', [Review::class, $producer]) ?? false,
            // An author sees their own review straight away, in its usual
            // place and in the usual card, marked as still waiting on a
            // moderator - it just isn't part of the public list above, so
            // nobody else gets it.
            'myPendingReview' => $user === null ? null : $producer->reviews()
                ->pending()
                ->where('user_id', $user->id)
                ->with('user:id,name,avatar_path')
                ->first(),
            // The owner has no one to message on their own page; everyone
            // else signed in can open a thread with this producer.
            'canMessage' => $user !== null && $producer->user_id !== $user->id,
            // Following is a standing request to hear about new listings,
            // which is a different thing from bookmarking (task 20.5).
            'canFollow' => $user !== null && $producer->user_id !== $user->id,
            'isFollowing' => $user !== null && $producer->followers()->whereKey($user->id)->exists(),
            'followersCount' => $producer->followers()->count(),
            // Reporting is for signed-in visitors only, so a complaint has
            // someone behind it.
            'canReport' => $user !== null && $producer->user_id !== $user->id,
            'reportReasons' => array_map(__(...), Report::REASONS),
            'isFavorited' => $user?->favorites()
                ->where('favoritable_type', 'household')
                ->where('favoritable_id', $producer->id)
                ->exists() ?? false,
        ]);
    }
}
