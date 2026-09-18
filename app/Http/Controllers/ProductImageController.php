<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProductImageController extends Controller
{
    public function store(Request $request, Producer $producer, Product $product): RedirectResponse
    {
        $this->authorize('update', $product);

        $request->validate([
            'images' => ['required', 'array'],
            'images.*' => ['image', 'max:4096'],
        ]);

        $nextOrder = (int) $product->images()->max('order') + ($product->images()->exists() ? 1 : 0);

        foreach ($request->file('images') as $file) {
            $product->images()->create([
                'path' => $file->store('products', 'public'),
                'order' => $nextOrder++,
            ]);
        }

        return back();
    }

    public function destroy(Producer $producer, Product $product, ProductImage $image): RedirectResponse
    {
        $this->authorize('update', $product);

        Storage::disk('public')->delete($image->path);
        $image->delete();

        return back();
    }

    public function makePrimary(Producer $producer, Product $product, ProductImage $image): RedirectResponse
    {
        $this->authorize('update', $product);

        DB::transaction(function () use ($product, $image) {
            $current = $product->images()->where('order', 0)->first();

            if ($current && $current->isNot($image)) {
                $current->update(['order' => $image->order]);
            }

            $image->update(['order' => 0]);
        });

        return back();
    }
}
