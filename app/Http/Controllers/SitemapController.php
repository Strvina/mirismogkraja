<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\Product;
use Illuminate\Http\Response;

/**
 * sitemap.xml (task 21).
 *
 * Most of the traffic for home-made food arrives from a search like "domaći
 * med Niš", so the producer and product pages have to be findable. Only
 * published pages are listed, and only the columns the file needs are read.
 */
class SitemapController extends Controller
{
    public function __invoke(): Response
    {
        $urls = collect([
            ['loc' => route('home'), 'priority' => '1.0', 'changefreq' => 'daily'],
            ['loc' => route('marketplace.producers.index'), 'priority' => '0.9', 'changefreq' => 'daily'],
            ['loc' => route('marketplace.products.index'), 'priority' => '0.9', 'changefreq' => 'daily'],
            ['loc' => route('marketplace.founding'), 'priority' => '0.5', 'changefreq' => 'weekly'],
            ['loc' => route('legal.terms'), 'priority' => '0.3', 'changefreq' => 'yearly'],
            ['loc' => route('legal.privacy'), 'priority' => '0.3', 'changefreq' => 'yearly'],
        ]);

        $producers = Producer::query()
            ->where('status', 'active')
            ->get(['slug', 'updated_at'])
            ->map(fn (Producer $producer) => [
                'loc' => route('marketplace.producers.show', $producer->slug),
                'lastmod' => $producer->updated_at?->toAtomString(),
                'priority' => '0.8',
                'changefreq' => 'weekly',
            ]);

        $products = Product::query()
            ->where('status', 'active')
            ->whereHas('producer', fn ($query) => $query->where('status', 'active'))
            ->get(['slug', 'updated_at'])
            ->map(fn (Product $product) => [
                'loc' => route('marketplace.products.show', $product->slug),
                'lastmod' => $product->updated_at?->toAtomString(),
                'priority' => '0.7',
                'changefreq' => 'weekly',
            ]);

        return response()
            ->view('sitemap', ['urls' => $urls->concat($producers)->concat($products)])
            ->header('Content-Type', 'application/xml');
    }
}
