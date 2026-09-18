<?php

namespace App\Http\Controllers\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProductController extends Controller
{
    /**
     * List active products (belonging to active producers), with optional
     * category/city/price filters and sorting.
     */
    public function index(Request $request): Response
    {
        $sort = $request->string('sort')->toString();

        $products = Product::query()
            ->where('status', 'active')
            ->whereHas('producer', fn ($query) => $query->where('status', 'active'))
            ->with(['images', 'producer'])
            ->when($request->integer('category_id'), fn ($query, $categoryId) => $query->where('category_id', $categoryId))
            ->when($request->string('city')->toString(), fn ($query, $city) => $query->whereHas(
                'producer',
                fn ($q) => $q->where('city', $city)
            ))
            ->when($request->filled('min_price'), fn ($query) => $query->where('price', '>=', $request->float('min_price')))
            ->when($request->filled('max_price'), fn ($query) => $query->where('price', '<=', $request->float('max_price')))
            ->when($sort === 'price_asc', fn ($query) => $query->orderBy('price'))
            ->when($sort === 'price_desc', fn ($query) => $query->orderByDesc('price'))
            ->when(! in_array($sort, ['price_asc', 'price_desc']), fn ($query) => $query->latest())
            ->get();

        // Query cities directly off Producer instead of loading every
        // matching Product just to read producer.city off each one.
        $cities = Producer::where('status', 'active')
            ->whereNotNull('city')
            ->whereHas('products', fn ($query) => $query->where('status', 'active'))
            ->distinct()
            ->orderBy('city')
            ->pluck('city');

        return Inertia::render('marketplace/products/index', [
            'products' => $products,
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'cities' => $cities,
            'filters' => $request->only(['category_id', 'city', 'min_price', 'max_price', 'sort']),
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
