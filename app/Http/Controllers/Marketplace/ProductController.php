<?php

namespace App\Http\Controllers\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProductController extends Controller
{
    /**
     * List active products (belonging to active households), with optional
     * category/city/price filters and sorting.
     */
    public function index(Request $request): Response
    {
        $sort = $request->string('sort')->toString();

        $products = Product::query()
            ->where('status', 'active')
            ->whereHas('household', fn ($query) => $query->where('status', 'active'))
            ->with(['images', 'household'])
            ->when($request->integer('category_id'), fn ($query, $categoryId) => $query->where('category_id', $categoryId))
            ->when($request->string('city')->toString(), fn ($query, $city) => $query->whereHas(
                'household',
                fn ($q) => $q->where('city', $city)
            ))
            ->when($request->filled('min_price'), fn ($query) => $query->where('price', '>=', $request->float('min_price')))
            ->when($request->filled('max_price'), fn ($query) => $query->where('price', '<=', $request->float('max_price')))
            ->when($sort === 'price_asc', fn ($query) => $query->orderBy('price'))
            ->when($sort === 'price_desc', fn ($query) => $query->orderByDesc('price'))
            ->when(! in_array($sort, ['price_asc', 'price_desc']), fn ($query) => $query->latest())
            ->get();

        $cities = Product::where('status', 'active')
            ->whereHas('household', fn ($query) => $query->where('status', 'active'))
            ->with('household')
            ->get()
            ->pluck('household.city')
            ->filter()
            ->unique()
            ->sort()
            ->values();

        return Inertia::render('marketplace/products/index', [
            'products' => $products,
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'cities' => $cities,
            'filters' => $request->only(['category_id', 'city', 'min_price', 'max_price', 'sort']),
        ]);
    }

    /**
     * Show a product's public page. Only 'active' products belonging to an
     * 'active' household are publicly visible.
     */
    public function show(Product $product): Response
    {
        $product->load(['household', 'category', 'images']);

        if ($product->status !== 'active' || $product->household->status !== 'active') {
            throw new NotFoundHttpException;
        }

        $similar = Product::where('category_id', $product->category_id)
            ->where('id', '!=', $product->id)
            ->where('status', 'active')
            ->limit(4)
            ->get();

        return Inertia::render('marketplace/products/show', [
            'product' => $product,
            'similar' => $similar,
        ]);
    }
}
