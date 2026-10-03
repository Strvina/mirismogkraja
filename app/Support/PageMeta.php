<?php

namespace App\Support;

use App\Models\Producer;
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
    private const DEFAULT_IMAGE = 'images/og-default.jpg';

    /** Open Graph's name for each language the site speaks. */
    public const OG_LOCALES = ['sr' => 'sr_RS', 'en' => 'en_US', 'ru' => 'ru_RU'];

    /**
     * The address without filters - a filtered list is the same page as far
     * as a search engine should know - but with the page number, since page
     * 2 of a list shows different things than page 1.
     */
    private static function canonical(): string
    {
        $page = request()->integer('page');

        return url()->current().($page > 1 ? "?page={$page}" : '');
    }

    /**
     * A producer as a local business: what a search engine can show as an
     * address, a map pin and a rating.
     *
     * @return array<string, mixed>
     */
    public static function producer(Producer $producer, float $rating, int $reviews): array
    {
        return array_filter([
            '@context' => 'https://schema.org',
            '@type' => 'LocalBusiness',
            'name' => $producer->name,
            'description' => Str::limit(Str::squish(strip_tags((string) $producer->description)), 500) ?: null,
            'url' => route('marketplace.producers.show', $producer->slug),
            'image' => ($producer->cover_image_path ?? $producer->logo_path) ? Media::absoluteUrl($producer->cover_image_path ?? $producer->logo_path) : null,
            'address' => $producer->city ? array_filter([
                '@type' => 'PostalAddress',
                'streetAddress' => $producer->address,
                'addressLocality' => $producer->city,
                'addressCountry' => 'RS',
            ]) : null,
            'geo' => $producer->lat && $producer->lng
                ? ['@type' => 'GeoCoordinates', 'latitude' => (float) $producer->lat, 'longitude' => (float) $producer->lng]
                : null,
            'aggregateRating' => $reviews > 0
                ? ['@type' => 'AggregateRating', 'ratingValue' => round($rating, 1), 'reviewCount' => $reviews, 'bestRating' => 5, 'worstRating' => 1]
                : null,
        ], fn ($value) => $value !== null);
    }

    /** @return array{title: string, description: string, url: string, image: string|null, type: string} */
    public static function make(string $title, ?string $description, ?string $imagePath = null, string $type = 'website'): array
    {
        return [
            'title' => $title,
            'description' => Str::limit(Str::squish(strip_tags((string) $description)), 160) ?: $title,
            'url' => self::canonical(),
            // A page without a photo of its own still gets a preview image.
            'image' => $imagePath ? Media::absoluteUrl($imagePath) : url(self::DEFAULT_IMAGE),
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
            'image' => $product->images->map(fn ($image) => Media::absoluteUrl($image->path))->values()->all() ?: null,
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
