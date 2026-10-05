<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request, Producer $producer): Response
    {
        $this->authorize('update', $producer);

        // "Čeka vas X kupaca" on the dashboard leads here with only the
        // products somebody is waiting for.
        $onlyWanted = $request->boolean('cekaju');

        return Inertia::render('products/index', [
            'producer' => $producer,
            'products' => $producer->products()
                ->with('category')
                // People who asked to hear when it is back.
                ->withCount('alerts as waiting_count')
                ->when($onlyWanted, fn ($query) => $query->has('alerts')->orderByDesc('waiting_count'))
                ->latest()
                ->paginate(30)
                ->withQueryString(),
            'waitingTotal' => $producer->productAlerts()->count(),
            'onlyWanted' => $onlyWanted,
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
        if ($producer->products()->count() >= Product::MAX_PER_PRODUCER) {
            throw ValidationException::withMessages([
                'name' => __('Proizvođač može imati najviše :max proizvoda. Obrišite neki koji više ne nudite.', ['max' => Product::MAX_PER_PRODUCER]),
            ]);
        }

        $products->create($producer, $request->validated());

        return to_route('producers.products.index', $producer);
    }

    public function edit(Producer $producer, Product $product): Response
    {
        abort_unless($product->producer_id === $producer->id, 404);
        $this->authorize('update', $product);

        return Inertia::render('products/edit', [
            'producer' => $producer,
            'product' => $product->load('images'),
            'categories' => Category::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(UpdateProductRequest $request, Producer $producer, Product $product, ProductService $products): RedirectResponse
    {
        abort_unless($product->producer_id === $producer->id, 404);
        $products->update($product, $request->validated());

        return to_route('producers.products.index', $producer);
    }

    public function destroy(Producer $producer, Product $product): RedirectResponse
    {
        abort_unless($product->producer_id === $producer->id, 404);
        $this->authorize('delete', $product);

        $product->delete();

        return to_route('producers.products.index', $producer);
    }
}
