<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Category;
use App\Models\Household;
use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Household $household): Response
    {
        $this->authorize('update', $household);

        return Inertia::render('products/index', [
            'household' => $household,
            'products' => $household->products()->with('category')->latest()->get(),
        ]);
    }

    public function create(Household $household): Response
    {
        $this->authorize('create', [Product::class, $household]);

        return Inertia::render('products/create', [
            'household' => $household,
            'categories' => Category::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(StoreProductRequest $request, Household $household, ProductService $products): RedirectResponse
    {
        $products->create($household, $request->validated());

        return to_route('households.products.index', $household);
    }

    public function edit(Household $household, Product $product): Response
    {
        $this->authorize('update', $product);

        return Inertia::render('products/edit', [
            'household' => $household,
            'product' => $product,
            'categories' => Category::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(UpdateProductRequest $request, Household $household, Product $product, ProductService $products): RedirectResponse
    {
        $products->update($product, $request->validated());

        return to_route('households.products.index', $household);
    }

    public function destroy(Household $household, Product $product): RedirectResponse
    {
        $this->authorize('delete', $product);

        $product->delete();

        return to_route('households.products.index', $household);
    }
}
