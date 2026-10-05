<?php

namespace App\Http\Controllers\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Services\Places;
use App\Services\SubscriptionService;
use App\Support\PageMeta;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * A place's own page (/mesto/nis) and a category within it (/mesto/nis/med).
 *
 * People search for home-made food by town - "domaći med Niš" - and a
 * query-string filter has no address, title or description for a search
 * engine to show. These pages do.
 */
class PlaceController extends Controller
{
    private const PER_PAGE = 20;

    /** Producers shown on the place's page; the directory has the rest. */
    private const PRODUCERS_SHOWN = 8;

    public function show(Request $request, string $place, Places $places, SubscriptionService $subscriptions): Response
    {
        return $this->page($request, $this->placeOrFail($places, $place), null, $places, $subscriptions);
    }

    public function category(Request $request, string $place, Category $category, Places $places, SubscriptionService $subscriptions): Response
    {
        $place = $this->placeOrFail($places, $place);

        // A category nobody here sells would be an empty page with an address.
        abort_unless(isset($place['categories'][$category->id]), 404);

        return $this->page($request, $place, $category, $places, $subscriptions);
    }

    /**
     * @param  array{slug: string, name: string, spellings: list<string>, products: int, categories: array<int, int>}  $place
     */
    private function page(Request $request, array $place, ?Category $category, Places $places, SubscriptionService $subscriptions): Response
    {
        abort_if($request->integer('page') > ProductController::MAX_PAGE, 404);

        $products = Product::query()
            ->published()
            ->withCardData()
            ->whereHas('producer', fn ($query) => $query->whereIn('city', $place['spellings']))
            ->when($category, fn ($query) => $query->where('category_id', $category->id))
            ->latest()
            // Products added in the same second keep one order from page to page.
            ->orderByDesc('products.id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        $favoritedIds = $request->user()?->favorites()
            ->where('favoritable_type', 'product')
            ->pluck('favoritable_id') ?? collect();

        // The people behind the products, on the place's own page only: a
        // category page is about the product.
        $producers = $category || ! $products->onFirstPage()
            ? collect()
            : Producer::published()->withCardData()->whereIn('city', $place['spellings'])->orderBy('name')->limit(self::PRODUCERS_SHOWN)->get();

        $subscriptions->markPremium($producers);

        $categoryName = $category ? __($category->name) : null;

        return Inertia::render('marketplace/places/show', [
            'meta' => $category
                ? PageMeta::make(
                    __(':category — :place | Vrelina juga', ['category' => $categoryName, 'place' => $place['name']]),
                    __('„:category” od domaćih proizvođača iz mesta :place. Pišite im direktno, bez posrednika.', ['category' => $categoryName, 'place' => $place['name']]),
                )
                : PageMeta::make(
                    __('Domaći proizvodi — :place | Vrelina juga', ['place' => $place['name']]),
                    __('Domaći proizvodi i proizvođači iz mesta :place. Pišite im direktno, bez posrednika.', ['place' => $place['name']]),
                ),
            'place' => ['slug' => $place['slug'], 'name' => $place['name']],
            'category' => $category?->only(['id', 'name', 'slug']),
            'categories' => $places->categoriesIn($place),
            'producers' => $producers,
            'products' => $products->through(fn (Product $product) => [
                ...$product->toArray(),
                'is_favorited' => $favoritedIds->contains($product->id),
            ]),
        ]);
    }

    /**
     * @return array{slug: string, name: string, spellings: list<string>, products: int, categories: array<int, int>}
     */
    private function placeOrFail(Places $places, string $slug): array
    {
        return $places->find($slug) ?? abort(404);
    }
}
