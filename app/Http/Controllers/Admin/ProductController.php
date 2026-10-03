<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Notifications\SiteNotification;
use App\Services\ProductService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    /** @var list<string> */
    private const STATUSES = [...Product::OWNER_STATUSES, Product::STATUS_BLOCKED];

    public function index(Request $request): Response
    {
        $products = Product::query()
            // Archiving an account soft-deletes its producers but leaves the
            // products behind; without withTrashed() those rows would render
            // with no producer at all in the admin table.
            ->with(['producer' => fn ($query) => $query->withTrashed()->select('id', 'name'), 'category:id,name'])
            ->when($request->string('search')->toString(), fn ($query, $search) => $query->where('name', 'like', "%{$search}%"))
            ->when($request->integer('producer_id'), fn ($query, $id) => $query->where('producer_id', $id))
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

    public function update(Request $request, Product $product, ProductService $products): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            ...StoreProductRequest::amountRules(),
            'category_id' => ['required', 'exists:categories,id'],
            'status' => ['required', Rule::in(self::STATUSES)],
        ]);

        // Keep public slugs consistent regardless of whether an owner or an
        // administrator changes the product name.
        $before = $product->status;
        $products->update($product, $data);
        $this->tellOwnerIfBlocked($product, $before);

        return back();
    }

    public function destroy(Product $product): RedirectResponse
    {
        $product->delete();

        return back();
    }

    /**
     * Bulk delete, or bulk set status/category. Deleting
     * goes one by one rather than through a mass delete so the audit
     * observer sees each row.
     */
    public function bulk(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(['delete', 'status', 'category'])],
            // Capped because each row goes through the model one by one.
            // Not checked against the table id by id: that is a query per
            // id, and an id that is not there simply matches nothing below.
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer'],
            'status' => ['required_if:action,status', Rule::in(self::STATUSES)],
            'category_id' => ['required_if:action,category', 'exists:categories,id'],
        ]);

        $products = Product::whereIn('id', $data['ids'])->get();

        foreach ($products as $product) {
            match ($data['action']) {
                'delete' => $product->delete(),
                'status' => $this->setStatus($product, $data['status']),
                'category' => $product->update(['category_id' => $data['category_id']]),
            };
        }

        return back();
    }

    private function setStatus(Product $product, string $status): void
    {
        $before = $product->status;
        $product->update(['status' => $status]);
        $this->tellOwnerIfBlocked($product, $before);
    }

    /** The owner hears why a listing disappeared, and where to fix it. */
    private function tellOwnerIfBlocked(Product $product, string $before): void
    {
        if ($before === Product::STATUS_BLOCKED || $product->status !== Product::STATUS_BLOCKED) {
            return;
        }

        $product->producer?->user?->notify(SiteNotification::productBlocked(
            $product->name,
            route('producers.products.edit', [$product->producer_id, $product->id]),
        ));
    }
}
