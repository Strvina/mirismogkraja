<?php

namespace App\Support;

use App\Models\Product;
use Illuminate\Support\Str;

/**
 * Description, canonical address and Open Graph tags for a public page.
 *
 * Written into the first HTML response by the root template, not by React:
 * there is no server-side rendering, so anything a component puts in <head>
 * exists only once JavaScript has run - and the crawlers that build a link
 * preview in Viber, WhatsApp or Facebook never run it.
 */
class PageMeta
{
    /** @return array{title: string, description: string, url: string, image: string|null, type: string} */
    public static function make(string $title, ?string $description, ?string $imagePath = null, string $type = 'website'): array
    {
        return [
            'title' => $title,
            'description' => Str::limit(Str::squish(strip_tags((string) $description)), 160) ?: $title,
            // Without the query string: a filtered or paged address is the
            // same page as far as a search engine should know.
            'url' => url()->current(),
            'image' => $imagePath ? asset('storage/'.$imagePath) : null,
            'type' => $type,
        ];
    }

    /**
     * schema.org Product data, which lets a search result show the price
     * and whether it is in stock. Expects producer, category and images
     * loaded.
     *
     * @return array<string, mixed>
     */
    public static function product(Product $product): array
    {
        return array_filter([
            '@context' => 'https://schema.org',
            '@type' => 'Product',
            'name' => $product->name,
            'description' => Str::limit(Str::squish(strip_tags((string) $product->description)), 500) ?: null,
            'image' => $product->images->map(fn ($image) => asset('storage/'.$image->path))->values()->all() ?: null,
            'category' => $product->category?->name,
            'offers' => [
                '@type' => 'Offer',
                'price' => (string) $product->price,
                'priceCurrency' => 'RSD',
                'availability' => $product->stock_quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                'url' => route('marketplace.products.show', $product->slug),
                'seller' => ['@type' => 'Organization', 'name' => $product->producer->name],
            ],
        ], fn ($value) => $value !== null);
    }
}
