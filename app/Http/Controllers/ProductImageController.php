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
    /** A product page shows its photos in one row; past this is clutter and disk. */
    public const MAX_IMAGES = 10;

    public function store(Request $request, Producer $producer, Product $product): RedirectResponse
    {
        abort_unless($product->household_id === $producer->id, 404);
        $this->authorize('update', $product);

        $request->validate([
            'images' => ['required', 'array', 'max:'.max(0, self::MAX_IMAGES - $product->images()->count())],
            'images.*' => ['image', 'max:4096'],
        ], [
            'images.max' => __('Proizvod može imati najviše :max fotografija.', ['max' => self::MAX_IMAGES]),
        ]);

        $nextOrder = ($product->images()->max('order') ?? -1) + 1;

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
        abort_unless($product->household_id === $producer->id && $image->product_id === $product->id, 404);
        $this->authorize('update', $product);

        Storage::disk('public')->delete($image->path);
        $image->delete();

        return back();
    }

    public function makePrimary(Producer $producer, Product $product, ProductImage $image): RedirectResponse
    {
        abort_unless($product->household_id === $producer->id && $image->product_id === $product->id, 404);
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
