<?php

namespace App\Services;

use App\Jobs\NotifyFollowersOfProduct;
use App\Models\Producer;
use App\Models\Product;
use App\Support\UniqueSlug;
use Illuminate\Database\UniqueConstraintViolationException;

class ProductService
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(Producer $producer, array $attributes): Product
    {
        // Two products with the same name at the same moment can pick the
        // same slug; the second one picks again.
        $product = retry(2, fn () => $producer->products()->create([
            ...$attributes,
            'slug' => UniqueSlug::for(Product::class, $attributes['name']),
        ]), 0, fn ($e) => $e instanceof UniqueConstraintViolationException);

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
        // The first time only: a product taken down and put back up has
        // already been announced.
        if (! $wasPublic && $product->isPubliclyVisible() && $product->published_at === null) {
            $product->forceFill(['published_at' => now()])->saveQuietly();

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
