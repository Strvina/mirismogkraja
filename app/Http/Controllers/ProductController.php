<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Producer $producer): Response
    {
        $this->authorize('update', $producer);

        return Inertia::render('products/index', [
            'producer' => $producer,
            'products' => $producer->products()->with('category')->latest()->get(),
        ]);
    }

    public function create(Producer $producer): Response
    {
        $this->authorize('create', [Product::class, $producer]);

        return Inertia::render('products/create', [
            'producer' => $producer,
            'categories' => Category::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(StoreProductRequest $request, Producer $producer, ProductService $products): RedirectResponse
    {
        $products->create($producer, $request->validated());

        return to_route('producers.products.index', $producer);
    }

    public function edit(Producer $producer, Product $product): Response
    {
        abort_unless($product->household_id === $producer->id, 404);
        $this->authorize('update', $product);

        return Inertia::render('products/edit', [
            'producer' => $producer,
            'product' => $product->load('images'),
            'categories' => Category::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(UpdateProductRequest $request, Producer $producer, Product $product, ProductService $products): RedirectResponse
    {
        abort_unless($product->household_id === $producer->id, 404);
        $products->update($product, $request->validated());

        return to_route('producers.products.index', $producer);
    }

    public function destroy(Producer $producer, Product $product): RedirectResponse
    {
        abort_unless($product->household_id === $producer->id, 404);
        $this->authorize('delete', $product);

        $product->delete();

        return to_route('producers.products.index', $producer);
    }
}
