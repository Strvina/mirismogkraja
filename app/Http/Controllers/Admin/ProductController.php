<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    /** @var list<string> */
    private const STATUSES = ['draft', 'active', 'out_of_stock', 'archived'];

    public function index(Request $request): Response
    {
        $products = Product::query()
            ->with(['producer:id,name', 'category:id,name'])
            ->when($request->string('search')->toString(), fn ($query, $search) => $query->where('name', 'like', "%{$search}%"))
            ->when($request->integer('producer_id'), fn ($query, $id) => $query->where('household_id', $id))
            ->when($request->string('status')->toString(), fn ($query, $status) => $query->where('status', $status))
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('admin/products/index', [
            'products' => $products,
            'producers' => Producer::orderBy('name')->get(['id', 'name']),
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'statuses' => self::STATUSES,
            'filters' => $request->only(['search', 'producer_id', 'status']),
        ]);
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'category_id' => ['required', 'exists:categories,id'],
            'status' => ['required', Rule::in(self::STATUSES)],
        ]);

        $product->update($data);

        return back();
    }

    public function destroy(Product $product): RedirectResponse
    {
        $product->delete();

        return back();
    }

    /**
     * Bulk delete, or bulk set status/category (task 14, point 1). Deleting
     * goes one by one rather than through a mass delete so the audit
     * observer sees each row.
     */
    public function bulk(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(['delete', 'status', 'category'])],
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:products,id'],
            'status' => ['required_if:action,status', Rule::in(self::STATUSES)],
            'category_id' => ['required_if:action,category', 'exists:categories,id'],
        ]);

        $products = Product::whereIn('id', $data['ids'])->get();

        foreach ($products as $product) {
            match ($data['action']) {
                'delete' => $product->delete(),
                'status' => $product->update(['status' => $data['status']]),
                'category' => $product->update(['category_id' => $data['category_id']]),
            };
        }

        return back();
    }
}
