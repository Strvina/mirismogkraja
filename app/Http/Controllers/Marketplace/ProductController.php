<?php

namespace App\Http\Controllers\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\Boost;
use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Models\Report;
use App\Services\BoostService;
use App\Services\ProducerStatistics;
use App\Services\ResponseTime;
use App\Services\SearchMisses;
use App\Support\PageMeta;
use App\Support\Search;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

use function Illuminate\Support\defer;

class ProductController extends Controller
{
    /** @var list<int> */
    private const PER_PAGE_OPTIONS = [10, 20, 50, 100];

    /**
     * Deeper than this a list is not being read, only crawled - and an
     * OFFSET that deep makes the database walk every row before it.
     */
    public const MAX_PAGE = 500;

    /** How long the filter choices (categories, producers, cities, prices) are kept. */
    private const FILTERS_SECONDS = 600;

    /** The columns of the products FULLTEXT index. */
    private const SEARCHED = ['name', 'description'];

    /**
     * List published products, with optional category/producer/city/price/
     * availability filters and sorting.
     *
     * Only the columns a card shows are read: the whole row - and the whole
     * producer behind it, story and phone number included - would make a
     * page of the catalog several times heavier than what it displays.
     */
    public function index(Request $request, BoostService $boosts, SearchMisses $misses): Response
    {
        return $this->listing($request, $boosts, $misses);
    }

    /**
     * A category's own page (/kategorija/med): the same list, filtered, with
     * an address, a title and a description a search engine can show for
     * "domaći med" - a query-string filter has none of those.
     */
    public function category(Request $request, Category $category, BoostService $boosts, SearchMisses $misses): Response
    {
        $request->merge(['category_id' => $category->id]);

        return $this->listing($request, $boosts, $misses, $category);
    }

    private function listing(Request $request, BoostService $boosts, SearchMisses $misses, ?Category $category = null): Response
    {
        abort_if($request->integer('page') > self::MAX_PAGE, 404);

        $sort = $request->string('sort')->toString();
        $search = Search::clean($request->string('q')->toString());

        $products = $this->filtered($request)
            ->when($sort === 'price_asc', fn ($query) => $query->orderBy('price'))
            ->when($sort === 'price_desc', fn ($query) => $query->orderByDesc('price'))
            // A search with no sort chosen: best matches first.
            ->when($search !== '' && ! in_array($sort, ['price_asc', 'price_desc']), fn ($query) => Search::orderByRelevance($query, self::SEARCHED, $search))
            ->when(! in_array($sort, ['price_asc', 'price_desc']), fn ($query) => $query->latest())
            ->paginate($this->perPage($request))
            ->withQueryString();

        // Boosted products get a labelled row of their own above the
        // results - within the visitor's filters, so a boost
        // never shows honey to someone looking for cheese - and are never
        // moved up the results themselves. Drawn at random on every visit.
        $featured = $products->onFirstPage()
            ? $this->filtered($request)
                ->whereIn('id', $boosts->runningIds(Boost::PRODUCT))
                ->inRandomOrder()
                // Enough to fill the slider on a wide screen.
                ->limit(8)
                ->get()
            : collect();

        // A search for "Jovanović" is often for the producer, not a
        // product: the few producers it matches are shown above the list.
        $matchingProducers = $search === '' || ! $products->onFirstPage() ? collect() : Search::apply(Producer::published(), ['name', 'description'], $search)
            ->limit(4)
            ->get(['id', 'name', 'slug', 'city', 'logo_path']);

        // Searched for and not on the site at all - no product, no producer,
        // and no other filter that could be what emptied the list. Counted
        // after the response is sent.
        if ($search !== '' && $category === null && $products->total() === 0 && $matchingProducers->isEmpty() && ! $this->narrowed($request)) {
            // As typed, not as cleaned for the query: an e-mail address with
            // its "@" stripped would no longer look like one.
            defer(fn () => $misses->record($request, $request->string('q')->toString()));
        }

        $choices = $this->filterChoices();

        $favoritedIds = $request->user()?->favorites()
            ->where('favoritable_type', 'product')
            ->pluck('favoritable_id') ?? collect();

        $card = fn (Product $product) => [
            ...$product->toArray(),
            'is_favorited' => $favoritedIds->contains($product->id),
        ];

        $name = $category ? __($category->name) : null;

        return Inertia::render('marketplace/products/index', [
            'meta' => $category
                ? PageMeta::make(
                    __(':category | Vrelina juga', ['category' => $name]),
                    __('Domaći proizvodi iz kategorije „:category”, direktno od proizvođača sa juga Srbije.', ['category' => $name]),
                )
                : PageMeta::make(__('Proizvodi | Vrelina juga'), __('Domaći proizvodi, direktno od ljudi koji ih prave.')),
            'category' => $category?->only(['id', 'name', 'slug']),
            'products' => $products->through($card),
            'featured' => $featured->map($card)->values(),
            ...$choices,
            'filters' => [
                ...$request->only(['category_id', 'producer_id', 'city', 'min_price', 'max_price', 'in_stock', 'in_season', 'sort']),
                'q' => $search !== '' ? $search : null,
            ],
            'matchingProducers' => $matchingProducers,
            'perPage' => $this->perPage($request),
            'perPageOptions' => self::PER_PAGE_OPTIONS,
        ]);
    }

    /**
     * Published products narrowed by the visitor's filters, with what a
     * card shows. Shared by the results and the boosted row above them.
     *
     * @return Builder<Product>
     */
    /**
     * What the filter panel offers. The same for every visitor and slow to
     * change, while working it out reads the whole catalogue - so it is
     * worked out once every few minutes, not on every page and filter.
     *
     * @return array{categories: array<int, mixed>, producers: array<int, mixed>, cities: array<int, string>, priceBounds: array{min: float, max: float}}
     */
    private function filterChoices(): array
    {
        return Cache::remember('catalog:filter-choices', self::FILTERS_SECONDS, function () {
            // Cities straight off Producer, not by loading every product.
            $sellingProducers = Producer::published()
                ->whereHas('products', fn ($query) => $query->where('status', 'active'));

            // Both ends of the price slider in one pass over the catalogue.
            $bounds = Product::query()->published()->toBase()
                ->selectRaw('min(price) as lowest, max(price) as highest')
                ->first();

            return [
                'categories' => Category::orderBy('name')->get(['id', 'name'])->toArray(),
                'producers' => (clone $sellingProducers)->orderBy('name')->get(['id', 'name'])->toArray(),
                'cities' => (clone $sellingProducers)->whereNotNull('city')->distinct()->orderBy('city')->pluck('city')->all(),
                'priceBounds' => ['min' => (float) $bounds->lowest, 'max' => (float) $bounds->highest],
            ];
        });
    }

    /** Whether anything besides the search words narrows the list. */
    private function narrowed(Request $request): bool
    {
        return collect($request->only(['category_id', 'producer_id', 'city', 'min_price', 'max_price', 'in_stock', 'in_season']))
            ->filter(fn ($value) => filled($value))
            ->isNotEmpty();
    }

    private function filtered(Request $request): Builder
    {
        return Product::query()
            ->published()
            ->select(['id', 'producer_id', 'name', 'slug', 'price', 'unit', 'stock_quantity', 'season_from', 'season_to', 'created_at'])
            ->with(['images:id,product_id,path,order', 'producer:id,name,city'])
            ->when($request->filled('q'), fn ($query) => Search::apply($query, self::SEARCHED, $request->string('q')->toString()))
            ->when($request->integer('category_id'), fn ($query, $categoryId) => $query->where('category_id', $categoryId))
            ->when($request->integer('producer_id'), fn ($query, $producerId) => $query->where('producer_id', $producerId))
            ->when($request->string('city')->toString(), fn ($query, $city) => $query->whereHas(
                'producer',
                fn ($q) => $q->where('city', $city)
            ))
            ->when($request->filled('min_price'), fn ($query) => $query->where('price', '>=', $request->float('min_price')))
            ->when($request->filled('max_price'), fn ($query) => $query->where('price', '<=', $request->float('max_price')))
            ->when($request->boolean('in_stock'), fn ($query) => $query->where('stock_quantity', '>', 0))
            ->when($request->boolean('in_season'), fn ($query) => $query->inSeason());
    }

    /**
     * Page size, defaulting to 20 and limited to the offered
     * options so a crafted query can't ask for the whole catalog at once.
     */
    private function perPage(Request $request): int
    {
        $requested = $request->integer('per_page');

        return in_array($requested, self::PER_PAGE_OPTIONS, true) ? $requested : 20;
    }

    /**
     * Show a product's public page. Only 'active' products belonging to an
     * 'active' producer are publicly visible.
     */
    public function show(Request $request, Product $product, ProducerStatistics $statistics, ResponseTime $responseTime): Response
    {
        $product->load(['producer:id,user_id,name,slug,city,logo_path,status', 'category:id,name', 'images']);

        if (! $product->isPubliclyVisible()) {
            throw new NotFoundHttpException;
        }

        defer(fn () => $statistics->record($request, $product->producer, ProducerStatistics::PRODUCT_VIEW, $product));

        $similar = Product::published()
            ->where('category_id', $product->category_id)
            ->whereKeyNot($product->id)
            ->select(['id', 'name', 'slug'])
            ->with('images:id,product_id,path,order')
            ->limit(4)
            ->get();

        $user = $request->user();

        return Inertia::render('marketplace/products/show', [
            'product' => $product,
            'similar' => $similar,
            'meta' => [
                ...PageMeta::make(
                    "{$product->name} - {$product->producer->name}",
                    $product->description,
                    $product->images->first()?->path,
                    'product',
                ),
                'structured' => PageMeta::product($product),
            ],
            // The owner has no one to ask about their own listing; anyone else
            // signed in can open a thread from here.
            'canInquire' => $user !== null && $product->producer->user_id !== $user->id,
            'responseTime' => $responseTime->bucketFor($product->producer),
            // "Javi mi kad stigne", for a product not available right now.
            'available' => $product->isAvailable(),
            'alertRequested' => $user !== null && $product->alerts()->where('user_id', $user->id)->exists(),
            'canReport' => $user !== null && $product->producer->user_id !== $user->id,
            'reportReasons' => array_map(__(...), Report::REASONS),
            'isFavorited' => $user?->favorites()
                ->where('favoritable_type', 'product')
                ->where('favoritable_id', $product->id)
                ->exists() ?? false,
        ]);
    }
}
