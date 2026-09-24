<?php

namespace App\Services;

use App\Models\Producer;
use App\Models\Product;
use App\Notifications\SiteNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

class ProductService
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(Producer $producer, array $attributes): Product
    {
        $product = $producer->products()->create([
            ...$attributes,
            'slug' => $this->uniqueSlug($attributes['name']),
        ]);

        $this->tellFollowers($producer, $product);

        return $product;
    }

    /**
     * Followers asked to hear about new listings (task 20.5), but only about
     * ones they can actually open - a draft is nobody's news.
     *
     * Sent in chunks: a producer with a few thousand followers would
     * otherwise build every notification in memory at once, on the request
     * that saved the product.
     */
    private function tellFollowers(Producer $producer, Product $product): void
    {
        if (! $product->isPubliclyVisible()) {
            return;
        }

        $notification = SiteNotification::productPublished(
            $producer->name,
            $product->name,
            route('marketplace.products.show', $product->slug),
        );

        $producer->followers()
            ->select('users.id')
            ->chunkById(200, fn ($followers) => Notification::send($followers, $notification), 'users.id');
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
