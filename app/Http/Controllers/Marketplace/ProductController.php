<?php

namespace App\Http\Controllers\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProductController extends Controller
{
    /**
     * List active products (belonging to active producers), with optional
     * category/producer/city/price/availability/rating filters and sorting.
     *
     * Note on `min_rating`: ratings live on producers, not products (reviews
     * are written about a producer), so this filters by the rating of the
     * producer behind each product.
     */
    public function index(Request $request): Response
    {
        $sort = $request->string('sort')->toString();

        $products = Product::query()
            ->where('status', 'active')
            ->whereHas('producer', fn ($query) => $query->where('status', 'active'))
            ->with(['images', 'producer'])
            ->when($request->integer('category_id'), fn ($query, $categoryId) => $query->where('category_id', $categoryId))
            ->when($request->integer('producer_id'), fn ($query, $producerId) => $query->where('household_id', $producerId))
            ->when($request->string('city')->toString(), fn ($query, $city) => $query->whereHas(
                'producer',
                fn ($q) => $q->where('city', $city)
            ))
            ->when($request->filled('min_price'), fn ($query) => $query->where('price', '>=', $request->float('min_price')))
            ->when($request->filled('max_price'), fn ($query) => $query->where('price', '<=', $request->float('max_price')))
            ->when($request->boolean('in_stock'), fn ($query) => $query->where('stock_quantity', '>', 0))
            // Whole stars only, and deliberately an int: binding a float here
            // makes SQLite compare the average against a text value, which
            // never matches.
            ->when($request->integer('min_rating'), fn ($query, $minRating) => $query->whereIn(
                'household_id',
                Review::query()
                    ->groupBy('household_id')
                    ->havingRaw('AVG(rating) >= ?', [$minRating])
                    ->pluck('household_id')
            ))
            ->when($sort === 'price_asc', fn ($query) => $query->orderBy('price'))
            ->when($sort === 'price_desc', fn ($query) => $query->orderByDesc('price'))
            ->when(! in_array($sort, ['price_asc', 'price_desc']), fn ($query) => $query->latest())
            ->get();

        // Query cities directly off Producer instead of loading every
        // matching Product just to read producer.city off each one.
        $sellingProducers = Producer::where('status', 'active')
            ->whereHas('products', fn ($query) => $query->where('status', 'active'));

        $favoritedIds = $request->user()?->favorites()
            ->where('favoritable_type', 'product')
            ->pluck('favoritable_id') ?? collect();

        return Inertia::render('marketplace/products/index', [
            'products' => $products->map(fn (Product $product) => [
                ...$product->toArray(),
                'is_favorited' => $favoritedIds->contains($product->id),
            ]),
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'producers' => (clone $sellingProducers)->orderBy('name')->get(['id', 'name']),
            'cities' => (clone $sellingProducers)->whereNotNull('city')->distinct()->orderBy('city')->pluck('city'),
            'priceBounds' => [
                'min' => (float) Product::where('status', 'active')->min('price'),
                'max' => (float) Product::where('status', 'active')->max('price'),
            ],
            'filters' => $request->only([
                'category_id', 'producer_id', 'city', 'min_price', 'max_price', 'in_stock', 'min_rating', 'sort',
            ]),
        ]);
    }

    /**
     * Show a product's public page. Only 'active' products belonging to an
     * 'active' producer are publicly visible.
     */
    public function show(Product $product): Response
    {
        $product->load(['producer', 'category', 'images']);

        if ($product->status !== 'active' || $product->producer->status !== 'active') {
            throw new NotFoundHttpException;
        }

        $similar = Product::where('category_id', $product->category_id)
            ->where('id', '!=', $product->id)
            ->where('status', 'active')
            ->with('images')
            ->limit(4)
            ->get();

        return Inertia::render('marketplace/products/show', [
            'product' => $product,
            'similar' => $similar,
            'isFavorited' => request()->user()?->favorites()
                ->where('favoritable_type', 'product')
                ->where('favoritable_id', $product->id)
                ->exists() ?? false,
        ]);
    }
}
