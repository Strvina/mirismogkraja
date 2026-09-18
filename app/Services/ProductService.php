<?php

namespace App\Services;

use App\Models\Producer;
use App\Models\Product;
use Illuminate\Support\Str;

class ProductService
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(Producer $producer, array $attributes): Product
    {
        return $producer->products()->create([
            ...$attributes,
            'slug' => $this->uniqueSlug($attributes['name']),
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(Product $product, array $attributes): Product
    {
        if ($attributes['name'] !== $product->name) {
            $attributes['slug'] = $this->uniqueSlug($attributes['name'], ignore: $product);
        }

        $product->update($attributes);

        return $product;
    }

    private function uniqueSlug(string $name, ?Product $ignore = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $suffix = 1;

        while (
            Product::where('slug', $slug)
                ->when($ignore, fn ($query) => $query->whereKeyNot($ignore))
                ->exists()
        ) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
