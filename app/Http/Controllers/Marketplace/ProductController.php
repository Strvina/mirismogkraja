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
use App\Support\PageMeta;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

use function Illuminate\Support\defer;

class ProductController extends Controller
{
    /** @var list<int> */
    private const PER_PAGE_OPTIONS = [10, 20, 50, 100];

    /**
     * List published products, with optional category/producer/city/price/
     * availability filters and sorting.
     *
     * Only the columns a card shows are read. The whole row - and the whole
     * producer behind it, story and phone number included - used to go out
     * once per card, which made a page of the catalog several times heavier
     * than what it displays.
     */
    public function index(Request $request, BoostService $boosts): Response
    {
        $sort = $request->string('sort')->toString();

        $products = $this->filtered($request)
            ->when($sort === 'price_asc', fn ($query) => $query->orderBy('price'))
            ->when($sort === 'price_desc', fn ($query) => $query->orderByDesc('price'))
            ->when(! in_array($sort, ['price_asc', 'price_desc']), fn ($query) => $query->latest())
            ->paginate($this->perPage($request))
            ->withQueryString();

        // Boosted products get a labelled row of their own above the
        // results (task 20.2) - within the visitor's filters, so a boost
        // never shows honey to someone looking for cheese - and are never
        // moved up the results themselves. Drawn at random on every visit.
        $featured = $products->onFirstPage()
            ? $this->filtered($request)
                ->whereIn('id', $boosts->runningIds(Boost::PRODUCT))
                ->inRandomOrder()
                ->limit(4)
                ->get()
            : collect();

        // Query cities directly off Producer instead of loading every
        // matching Product just to read producer.city off each one.
        $sellingProducers = Producer::published()
            ->whereHas('products', fn ($query) => $query->where('status', 'active'));

        // Both ends of the slider in one pass over the catalog, not two.
        $bounds = Product::query()->published()->toBase()
            ->selectRaw('min(price) as lowest, max(price) as highest')
            ->first();

        $favoritedIds = $request->user()?->favorites()
            ->where('favoritable_type', 'product')
            ->pluck('favoritable_id') ?? collect();

        $card = fn (Product $product) => [
            ...$product->toArray(),
            'is_favorited' => $favoritedIds->contains($product->id),
        ];

        return Inertia::render('marketplace/products/index', [
            'products' => $products->through($card),
            'featured' => $featured->map($card)->values(),
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'producers' => (clone $sellingProducers)->orderBy('name')->get(['id', 'name']),
            'cities' => (clone $sellingProducers)->whereNotNull('city')->distinct()->orderBy('city')->pluck('city'),
            'priceBounds' => ['min' => (float) $bounds->lowest, 'max' => (float) $bounds->highest],
            'filters' => $request->only([
                'category_id', 'producer_id', 'city', 'min_price', 'max_price', 'in_stock', 'sort',
            ]),
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
    private function filtered(Request $request): Builder
    {
        return Product::query()
            ->published()
            ->select(['id', 'household_id', 'name', 'slug', 'price', 'unit', 'stock_quantity', 'created_at'])
            ->with(['images:id,product_id,path,order', 'producer:id,name,city'])
            ->when($request->integer('category_id'), fn ($query, $categoryId) => $query->where('category_id', $categoryId))
            ->when($request->integer('producer_id'), fn ($query, $producerId) => $query->where('household_id', $producerId))
            ->when($request->string('city')->toString(), fn ($query, $city) => $query->whereHas(
                'producer',
                fn ($q) => $q->where('city', $city)
            ))
            ->when($request->filled('min_price'), fn ($query) => $query->where('price', '>=', $request->float('min_price')))
            ->when($request->filled('max_price'), fn ($query) => $query->where('price', '<=', $request->float('max_price')))
            ->when($request->boolean('in_stock'), fn ($query) => $query->where('stock_quantity', '>', 0));
    }

    /**
     * Page size, defaulting to 20 (task 10) and limited to the offered
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
    public function show(Request $request, Product $product, ProducerStatistics $statistics): Response
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
            'meta' => PageMeta::make(
                "{$product->name} - {$product->producer->name}",
                $product->description,
                $product->images->first()?->path,
                'product',
            ),
            // The owner has no one to ask about their own listing; anyone else
            // signed in can open a thread from here.
            'canInquire' => $user !== null && $product->producer->user_id !== $user->id,
            'canReport' => $user !== null && $product->producer->user_id !== $user->id,
            'reportReasons' => Report::REASONS,
            'isFavorited' => $user?->favorites()
                ->where('favoritable_type', 'product')
                ->where('favoritable_id', $product->id)
                ->exists() ?? false,
        ]);
    }
}
