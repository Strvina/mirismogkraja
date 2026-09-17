<?php

namespace App\Http\Controllers\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProductController extends Controller
{
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
