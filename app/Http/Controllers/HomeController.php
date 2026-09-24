<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
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
    public function __invoke(): Response
    {
        return Inertia::render('welcome', [
            'newProducers' => $this->mapProducers(
                $this->activeProducers()->latest()->take(10)->get()
            ),

            // A producer nobody has saved or reviewed yet isn't popular, so
            // the section stays empty rather than padding itself with the
            // newest rows over again.
            'popularProducers' => $this->mapProducers(
                $this->activeProducers()
                    ->orderByRaw('(favorites_count + reviews_count) desc')
                    ->orderByDesc('reviews_avg_rating')
                    ->take(10)
                    ->get()
                    ->filter(fn (Producer $producer) => $producer->favorites_count + $producer->reviews_count > 0)
                    ->values()
            ),

            'popularProducts' => $this->mapProducts(),

            'categories' => Category::query()
                ->whereHas('products', fn ($query) => $query->where('status', 'active')
                    ->whereHas('producer', fn ($producerQuery) => $producerQuery->where('status', 'active')))
                ->orderBy('name')
                ->take(6)
                ->get(['id', 'name']),
        ]);
    }

    /**
     * Active producers with everything a card shows. The two counts double
     * as the popularity score, so the ordering happens in the database
     * instead of over a fully hydrated collection.
     *
     * @return Builder<Producer>
     */
    private function activeProducers(): Builder
    {
        return Producer::query()
            ->where('status', 'active')
            ->withCount([
                'favorites',
                'reviews' => fn ($query) => $query->approved(),
                'products' => fn ($query) => $query->where('status', 'active'),
            ])
            ->withAvg(['reviews' => fn ($query) => $query->approved()], 'rating')
            ->with(['products' => fn ($query) => $query->where('status', 'active')->with('category:id,name')]);
    }

    /**
     * @param  Collection<int, Producer>  $producers
     * @return Collection<int, array<string, mixed>>
     */
    private function mapProducers(Collection $producers): Collection
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
            'tags' => $producer->products
                ->pluck('category.name')
                ->filter()
                ->unique()
                ->take(2)
                ->values(),
        ]);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function mapProducts(): Collection
    {
        return Product::query()
            ->where('status', 'active')
            ->whereHas('producer', fn ($query) => $query->where('status', 'active'))
            ->with(['producer:id,name,slug,city', 'images'])
            ->withCount(['favorites', 'inquiries'])
            ->orderByDesc('favorites_count')
            ->orderByDesc('inquiries_count')
            ->latest()
            ->take(10)
            ->get()
            ->map(fn (Product $product) => [
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
            ]);
    }
}
