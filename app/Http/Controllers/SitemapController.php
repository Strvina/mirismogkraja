<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

/**
 * sitemap.xml (task 21).
 *
 * Most of the traffic for home-made food arrives from a search like "domaći
 * med Niš", so the producer and product pages have to be findable. Only
 * published pages are listed, and only the columns the file needs are read.
 *
 * /sitemap.xml is an index pointing at files of at most PER_FILE addresses
 * each - search engines take 50,000 per file, and one file for the whole
 * catalogue would also have to be built in memory in one go. Files are cut
 * by id range, so building one reads one index range, and each is cached
 * for an hour: crawlers ask often, the catalogue changes slowly.
 */
class SitemapController extends Controller
{
    public const PER_FILE = 10_000;

    private const CACHE_SECONDS = 3600;

    /** The index: the static pages, then every producer and product file. */
    public function index(): Response
    {
        return $this->xml('sitemap:index', fn () => view('sitemap-index', [
            'files' => [
                route('sitemap.pages'),
                ...$this->files('producers', Producer::published()),
                ...$this->files('products', Product::published()),
            ],
        ])->render());
    }

    public function pages(): Response
    {
        return $this->xml('sitemap:pages', fn () => view('sitemap', ['urls' => [
            ['loc' => route('home'), 'priority' => '1.0', 'changefreq' => 'daily'],
            ['loc' => route('marketplace.producers.index'), 'priority' => '0.9', 'changefreq' => 'daily'],
            ['loc' => route('marketplace.products.index'), 'priority' => '0.9', 'changefreq' => 'daily'],
            ['loc' => route('marketplace.founding'), 'priority' => '0.5', 'changefreq' => 'weekly'],
            ['loc' => route('legal.terms'), 'priority' => '0.3', 'changefreq' => 'yearly'],
            ['loc' => route('legal.privacy'), 'priority' => '0.3', 'changefreq' => 'yearly'],
        ]])->render());
    }

    public function section(string $section, int $page): Response
    {
        [$query, $route, $priority] = $section === 'producers'
            ? [Producer::published(), 'marketplace.producers.show', '0.8']
            : [Product::published(), 'marketplace.products.show', '0.7'];

        return $this->xml("sitemap:{$section}:{$page}", fn () => view('sitemap', [
            'urls' => $query
                ->whereBetween($query->qualifyColumn('id'), [($page - 1) * self::PER_FILE + 1, $page * self::PER_FILE])
                ->toBase()
                ->get([$query->qualifyColumn('slug'), $query->qualifyColumn('updated_at')])
                ->map(fn (object $row) => [
                    'loc' => route($route, $row->slug),
                    'lastmod' => $row->updated_at ? date(DATE_ATOM, strtotime($row->updated_at)) : null,
                    'priority' => $priority,
                    'changefreq' => 'weekly',
                ]),
        ])->render());
    }

    /**
     * One file per id range up to the highest published id.
     *
     * @param  Builder<Producer>|Builder<Product>  $query
     * @return list<string>
     */
    private function files(string $section, Builder $query): array
    {
        $pages = (int) ceil(((int) $query->max($query->qualifyColumn('id'))) / self::PER_FILE);

        return array_map(fn (int $page) => route('sitemap.section', [$section, $page]), $pages > 0 ? range(1, $pages) : []);
    }

    /** @param  callable(): string  $build */
    private function xml(string $key, callable $build): Response
    {
        return response(Cache::remember($key, self::CACHE_SECONDS, $build), 200, ['Content-Type' => 'application/xml']);
    }
}
