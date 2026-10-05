<?php

namespace App\Http\Controllers\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Producer;
use App\Models\ProducerMarket;
use App\Models\Product;
use App\Services\ProducerStatistics;
use App\Support\PageMeta;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;
use Inertia\Response;

use function Illuminate\Support\defer;

/**
 * "Moj katalog": a producer's whole offer as a price list, on one address
 * made to be sent - in a Viber group, on WhatsApp, in a text.
 *
 * The producer's page tells who they are; this one answers the question a
 * regular buyer actually sends: "šta imate i pošto?". Its link preview
 * (see PageMeta) already carries the first prices.
 */
class CatalogController extends Controller
{
    private const PER_PAGE = 60;

    /** How many products the link preview's description names. */
    private const PREVIEW_PRODUCTS = 4;

    public function __invoke(Request $request, Producer $producer, ProducerStatistics $statistics): Response
    {
        abort_unless($producer->status === 'active', 404);

        defer(fn () => $statistics->record($request, $producer, ProducerStatistics::CATALOG_VIEW));

        $products = $producer->products()
            ->where('status', 'active')
            ->select(['id', 'producer_id', 'category_id', 'name', 'slug', 'price', 'unit', 'stock_quantity', 'season_from', 'season_to'])
            ->with(['category:id,name', 'images:id,product_id,path,order'])
            // By category, so the list reads as a price list does: all the
            // honey together, then all the rakija.
            ->orderBy(Category::select('name')->whereColumn('categories.id', 'products.category_id'))
            ->orderBy('name')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        // Read from the models, before the list is cut down to what the page prints.
        $meta = [
            ...PageMeta::make(
                __(':name — ponuda i cene', ['name' => $producer->name]),
                $this->previewText($producer, $products),
                $producer->logo_path ?? $producer->cover_image_path,
            ),
            'structured' => PageMeta::catalog($producer, $products->getCollection()),
        ];

        return Inertia::render('marketplace/catalog', [
            'producer' => [
                ...$producer->only(['id', 'name', 'slug', 'city', 'address', 'contact_email', 'logo_path', 'verified_at', 'delivery_methods']),
                'has_phone' => filled($producer->phone),
            ],
            // Only on "Prikaži broj", as on the producer's page.
            'phone' => Inertia::optional(fn () => $producer->phone),
            'products' => $products->through(fn (Product $product) => [
                ...$product->only(['id', 'name', 'slug', 'price', 'unit', 'season_from', 'season_to']),
                'category' => $product->category?->name,
                'image' => $product->images->first()?->path,
                'available' => $product->isAvailable(),
            ]),
            'markets' => $producer->markets()->get(ProducerMarket::PUBLIC_COLUMNS),
            // Everyone but the owner; a guest is asked to sign in on the way.
            'canMessage' => $request->user()?->id !== $producer->user_id,
            'meta' => $meta,
        ]);
    }

    /**
     * What a chat app prints under the link: the first prices, so the
     * message is useful before anyone opens it.
     *
     * @param  LengthAwarePaginator<int, Product>  $products
     */
    private function previewText(Producer $producer, LengthAwarePaginator $products): string
    {
        $prices = $products->getCollection()
            ->take(self::PREVIEW_PRODUCTS)
            ->map(fn (Product $product) => "{$product->name} ".number_format((float) $product->price, 0, ',', '.')." RSD/{$product->unit}")
            ->implode(' · ');

        return $prices !== '' ? $prices : (string) $producer->description;
    }
}
