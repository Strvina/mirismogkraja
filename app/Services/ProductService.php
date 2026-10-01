<?php

namespace App\Services;

use App\Jobs\NotifyFollowersOfProduct;
use App\Models\Producer;
use App\Models\Product;
use App\Support\UniqueSlug;

class ProductService
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(Producer $producer, array $attributes): Product
    {
        $product = $producer->products()->create([
            ...$attributes,
            'slug' => UniqueSlug::for(Product::class, $attributes['name']),
        ]);

        $this->tellFollowersIfPublished($product, wasPublic: false);

        return $product;
    }

    /**
     * Followers asked to hear about new listings (task 20.5), but only about
     * ones they can actually open - a draft is nobody's news - and once, when
     * it goes public. Sent after the response (see NotifyFollowersOfProduct).
     */
    private function tellFollowersIfPublished(Product $product, bool $wasPublic): void
    {
        if (! $wasPublic && $product->isPubliclyVisible()) {
            NotifyFollowersOfProduct::dispatch($product)->afterResponse();
        }
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(Product $product, array $attributes): Product
    {
        if ($attributes['name'] !== $product->name) {
            $attributes['slug'] = UniqueSlug::for(Product::class, $attributes['name'], ignore: $product);
        }

        $wasPublic = $product->isPubliclyVisible();

        $product->update($attributes);

        // A draft published later is news too, the moment it goes up.
        $this->tellFollowersIfPublished($product, $wasPublic);

        return $product;
    }
}
