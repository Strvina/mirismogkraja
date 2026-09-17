<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/products/index', [
            'products' => Product::with('household:id,name')->orderByDesc('created_at')->get(),
        ]);
    }

    public function destroy(Product $product): RedirectResponse
    {
        $product->delete();

        return back();
    }
}
