<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\CampaignParticipant;
use App\Models\Category;
use App\Models\Post;
use App\Models\Producer;
use App\Models\Product;
use App\Models\WeeklyPick;
use App\Services\SubscriptionService;
use App\Support\PageMeta;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    /**
     * How long the popularity rankings are kept. Ranking means counting
     * favourites and reviews for every producer and product, on the most
     * visited page; a ranking a few minutes old is just as true.
     */
    private const RANKING_SECONDS = 600;

    /**
     * The landing page is the discovery surface: newest producers, the ones
     * people actually engage with, and the products they engage with.
     *
     * "Popular" is measured only from things the platform genuinely records -
     * favourites (a deliberate save by a signed-in person), approved reviews,
     * and, for products, the inquiries opened from their page. There are no
     * orders to rank by, by design, and page views aren't tracked, so nothing
     * here is invented.
     */
    public function __invoke(SubscriptionService $subscriptions): Response
    {
        // The homepage slot is what the top plan pays for. It
        // is its own labelled section, drawn at random from the paying
        // producers on every visit so none of them owns it.
        $featuredProducers = $this->publishedProducers()
            ->whereIn('id', $subscriptions->producerIdsWith('homepage'))
            ->inRandomOrder()
            ->take(4)
            ->get();

        $newProducers = $this->publishedProducers()->latest()->take(10)->get();

        // Only the ranking is cached - which ids, in what order. The cards
        // are read fresh, so a producer hidden since drops out at once.
        $popularProducers = $this->inOrder(
            $this->publishedProducers()->whereIn('id', $this->popularProducerIds())->get(),
            $this->popularProducerIds(),
        );

        // "Proizvođač nedelje", chosen by an admin. Only shown
        // while the producer - and the product, if one was picked - is
        // still public.
        $pick = WeeklyPick::current()->first();
        $weeklyProducer = $pick ? $this->publishedProducers()->find($pick->producer_id) : null;
        $weeklyProduct = $weeklyProducer && $pick->product_id
            ? $this->productCards()->find($pick->product_id)
            : null;

        $everyone = $featuredProducers->concat($newProducers)->concat($popularProducers)->concat(array_filter([$weeklyProducer]));
        $tags = $this->categoryTags($everyone->pluck('id')->unique());
        $subscriptions->markPremium($everyone);

        return Inertia::render('welcome', [
            'meta' => [
                ...PageMeta::make(
                    __('Vrelina juga | Domaći proizvođači sa juga Srbije'),
                    __('Upoznajte proizvođače, ljude i proizvode koji čuvaju tradiciju juga Srbije.'),
                ),
                'structured' => PageMeta::website(),
            ],
            // Seasonal campaigns under way, announced at the top of the page.
            'campaigns' => Campaign::running()
                ->withCount(['participants as producers_count' => fn ($query) => $query->where('status', CampaignParticipant::STATUS_ACTIVE)])
                ->orderBy('ends_on')
                ->get(['id', 'name', 'slug', 'description', 'starts_on', 'ends_on']),
            'weeklyPick' => $weeklyProducer ? [
                'producer' => $this->mapProducers(collect([$weeklyProducer]), $tags)->first(),
                'product' => $weeklyProduct ? $this->mapProduct($weeklyProduct) : null,
            ] : null,
            'featuredProducers' => $this->mapProducers($featuredProducers, $tags),
            'newProducers' => $this->mapProducers($newProducers, $tags),
            'popularProducers' => $this->mapProducers($popularProducers, $tags),
            'popularProducts' => $this->mapProducts($this->popularProductIds()),
            // What has its season this month; the section is left out while there is nothing.
            'seasonalProducts' => $this->mapProducts($this->seasonalProductIds()),
            'seasonMonth' => now()->month,
            // The newest stories and recipes; the section is left out while there are none.
            'latestPosts' => Post::published()
                ->with('producer:id,name,slug,city,logo_path')
                ->orderByDesc('published_at')
                ->limit(3)
                ->get(Post::CARD_COLUMNS),
            // Which categories have anything in them changes rarely, and
            // finding out means looking through the whole catalogue.
            'categories' => Cache::remember('home:categories:v2', self::RANKING_SECONDS, fn () => Category::query()
                ->whereHas('products', fn ($query) => $query->published())
                ->orderBy('name')
                ->take(6)
                ->get(['id', 'name', 'slug'])
                ->toArray()),
        ]);
    }

    /**
     * Published producers with everything a card shows. The two counts
     * double as the popularity score, so the ordering happens in the
     * database instead of over a fully hydrated collection.
     *
     * @return Builder<Producer>
     */
    private function publishedProducers(): Builder
    {
        return Producer::published()
            ->select(['id', 'name', 'slug', 'city', 'description', 'cover_image_path', 'logo_path', 'created_at'])
            ->withCount([
                'favorites',
                'reviews' => fn ($query) => $query->approved(),
                'products' => fn ($query) => $query->where('status', 'active'),
            ])
            ->withAvg(['reviews' => fn ($query) => $query->approved()], 'rating');
    }

    /**
     * Up to two category names per producer, for the tags on its card.
     *
     * Read as distinct (producer, category) pairs in one query. It used to
     * load every active product of every producer on the page, with its
     * category, only to keep two names.
     *
     * @param  Collection<int, int>  $producerIds
     * @return Collection<int, Collection<int, string>>
     */
    private function categoryTags(Collection $producerIds): Collection
    {
        return Product::query()
            ->where('products.status', 'active')
            ->whereIn('producer_id', $producerIds)
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->distinct()
            ->orderBy('categories.name')
            ->toBase()
            ->get(['products.producer_id', 'categories.name'])
            ->groupBy('producer_id')
            ->map(fn (Collection $rows) => $rows->pluck('name')->take(2)->values());
    }

    /**
     * @param  Collection<int, Producer>  $producers
     * @param  Collection<int, Collection<int, string>>  $tags
     * @return Collection<int, array<string, mixed>>
     */
    private function mapProducers(Collection $producers, Collection $tags): Collection
    {
        return $producers->map(fn (Producer $producer) => [
            'id' => $producer->id,
            'name' => $producer->name,
            'slug' => $producer->slug,
            'city' => $producer->city,
            'description' => $producer->description,
            'cover_image_path' => $producer->cover_image_path,
            'logo_path' => $producer->logo_path,
            'products_count' => $producer->products_count,
            'reviews_count' => $producer->reviews_count,
            'rating' => $producer->reviews_avg_rating ? round($producer->reviews_avg_rating, 1) : null,
            'tags' => $tags->get($producer->id, collect()),
            'is_premium' => (bool) $producer->is_premium,
        ]);
    }

    /**
     * The ten producers people engage with most. A producer nobody has
     * saved or reviewed yet isn't popular, so the section stays empty
     * rather than padding itself with the newest rows over again.
     *
     * @return list<int>
     */
    private function popularProducerIds(): array
    {
        return Cache::remember('home:popular-producers', self::RANKING_SECONDS, fn () => Producer::published()
            ->withCount(['favorites', 'reviews' => fn ($query) => $query->approved()])
            ->withAvg(['reviews' => fn ($query) => $query->approved()], 'rating')
            ->orderByRaw('(favorites_count + reviews_count) desc')
            ->orderByDesc('reviews_avg_rating')
            ->take(10)
            ->get(['id'])
            ->filter(fn (Producer $producer) => $producer->favorites_count + $producer->reviews_count > 0)
            ->modelKeys());
    }

    /** @return list<int> */
    private function popularProductIds(): array
    {
        return Cache::remember('home:popular-products', self::RANKING_SECONDS, fn () => Product::published()
            ->withCount(['favorites', 'inquiries'])
            ->orderByDesc('favorites_count')
            ->orderByDesc('inquiries_count')
            ->latest()
            ->take(10)
            ->get(['id'])
            ->modelKeys());
    }

    /**
     * Rows fetched by id, put back in the ranking's order.
     *
     * @template T of \Illuminate\Database\Eloquent\Model
     *
     * @param  Collection<int, T>  $rows
     * @param  list<int>  $ids
     * @return Collection<int, T>
     */
    private function inOrder(Collection $rows, array $ids): Collection
    {
        $position = array_flip($ids);

        return $rows->sortBy(fn ($row) => $position[$row->getKey()])->values();
    }

    /**
     * The newest ten products whose season covers this month. Keyed by the
     * month, so the list turns over with the calendar and not ten minutes
     * into the first of the month.
     *
     * @return list<int>
     */
    private function seasonalProductIds(): array
    {
        return Cache::remember('home:seasonal-products:'.now()->month, self::RANKING_SECONDS, fn () => Product::published()
            ->seasonal()
            ->latest()
            ->take(10)
            ->get(['id'])
            ->modelKeys());
    }

    /**
     * @param  list<int>  $ids
     * @return Collection<int, array<string, mixed>>
     */
    private function mapProducts(array $ids): Collection
    {
        if ($ids === []) {
            return collect();
        }

        return $this->inOrder($this->productCards()->whereIn('id', $ids)->get(), $ids)
            ->map(fn (Product $product) => $this->mapProduct($product));
    }

    /**
     * Published products with what a product card shows.
     *
     * @return Builder<Product>
     */
    private function productCards(): Builder
    {
        return Product::published()
            ->select(['id', 'producer_id', 'name', 'slug', 'price', 'unit', 'created_at'])
            ->with(['producer:id,name,slug,city', 'images:id,product_id,path,order']);
    }

    /** @return array<string, mixed> */
    private function mapProduct(Product $product): array
    {
        return [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'price' => $product->price,
            'unit' => $product->unit,
            'image' => $product->images->first()?->path,
            'producer' => [
                'name' => $product->producer->name,
                'slug' => $product->producer->slug,
                'city' => $product->producer->city,
            ],
        ];
    }
}
