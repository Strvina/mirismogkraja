<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Post;
use App\Models\Producer;
use App\Models\Product;
use App\Services\Places;
use App\Services\SeasonCalendar;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

/**
 * sitemap.xml.
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
                ...$this->files('catalogs', $this->catalogs()),
                ...$this->files('posts', Post::published()),
            ],
        ])->render());
    }

    public function pages(Places $places, SeasonCalendar $calendar): Response
    {
        return $this->xml('sitemap:pages', fn () => view('sitemap', ['urls' => [
            ['loc' => route('home'), 'priority' => '1.0', 'changefreq' => 'daily'],
            ['loc' => route('marketplace.producers.index'), 'priority' => '0.9', 'changefreq' => 'daily'],
            ['loc' => route('marketplace.products.index'), 'priority' => '0.9', 'changefreq' => 'daily'],
            ['loc' => route('marketplace.posts.index'), 'priority' => '0.7', 'changefreq' => 'daily'],
            ['loc' => route('marketplace.founding'), 'priority' => '0.5', 'changefreq' => 'weekly'],
            // Categories with something in them.
            ...Category::query()
                ->whereHas('products', fn ($query) => $query->published())
                ->orderBy('name')
                ->pluck('slug')
                ->map(fn (string $slug) => ['loc' => route('marketplace.categories.show', $slug), 'priority' => '0.8', 'changefreq' => 'daily'])
                ->all(),
            ...$this->places($places),
            // The months something is in season.
            ...array_map(
                fn (int $month) => ['loc' => route('marketplace.season.show', $calendar->slug($month)), 'priority' => '0.7', 'changefreq' => 'weekly'],
                $calendar->monthsWithProducts(),
            ),
            ['loc' => route('info.how'), 'priority' => '0.6', 'changefreq' => 'monthly'],
            ['loc' => route('info.producers'), 'priority' => '0.6', 'changefreq' => 'monthly'],
            ['loc' => route('info.faq'), 'priority' => '0.5', 'changefreq' => 'monthly'],
            ['loc' => route('info.about'), 'priority' => '0.4', 'changefreq' => 'yearly'],
            ['loc' => route('info.contact'), 'priority' => '0.4', 'changefreq' => 'yearly'],
            ['loc' => route('legal.terms'), 'priority' => '0.3', 'changefreq' => 'yearly'],
            ['loc' => route('legal.privacy'), 'priority' => '0.3', 'changefreq' => 'yearly'],
        ]])->render());
    }

    public function section(string $section, int $page): Response
    {
        [$query, $route, $priority] = match ($section) {
            'producers' => [Producer::published(), 'marketplace.producers.show', '0.8'],
            'catalogs' => [$this->catalogs(), 'marketplace.catalog', '0.6'],
            'posts' => [Post::published(), 'marketplace.posts.show', '0.6'],
            default => [Product::published(), 'marketplace.products.show', '0.7'],
        };

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
     * Producers with a price list worth an address: at least one product on
     * sale. /katalog of a producer with none is an empty page.
     *
     * @return Builder<Producer>
     */
    private function catalogs(): Builder
    {
        return Producer::published()->whereHas('products', fn (Builder $products) => $products->where('status', 'active'));
    }

    /**
     * Every place, and every category sold from it. Towns times categories
     * stays in the hundreds, so they fit in the pages file.
     *
     * @return list<array{loc: string, priority: string, changefreq: string}>
     */
    private function places(Places $places): array
    {
        $slugs = Category::pluck('slug', 'id');
        $urls = [];

        foreach ($places->all() as $place) {
            $urls[] = ['loc' => route('marketplace.places.show', $place['slug']), 'priority' => '0.8', 'changefreq' => 'daily'];

            foreach (array_keys($place['categories']) as $categoryId) {
                if (isset($slugs[$categoryId])) {
                    $urls[] = ['loc' => route('marketplace.places.category', [$place['slug'], $slugs[$categoryId]]), 'priority' => '0.7', 'changefreq' => 'daily'];
                }
            }
        }

        return $urls;
    }

    /**
     * One file per id range up to the highest published id.
     *
     * @param  Builder<Producer>|Builder<Product>|Builder<Post>  $query
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
