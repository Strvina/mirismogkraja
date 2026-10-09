<?php

namespace App\Http\Controllers\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\SeasonCalendar;
use App\Support\PageMeta;
use App\Support\ProductCards;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * What is in season, month by month. Home-made food is seasonal in a way a
 * shop's shelf is not - ajvar in autumn, strawberries in May - and "what can
 * I get now" is the question a visitor without a product in mind arrives
 * with.
 */
class SeasonController extends Controller
{
    private const PER_PAGE = 20;

    /**
     * /sezona is always this month. A redirect, not the same page on two
     * addresses: each month keeps one address a search engine can hold on to.
     */
    public function index(SeasonCalendar $calendar): RedirectResponse
    {
        return redirect()->route('marketplace.season.show', $calendar->slug(now()->month));
    }

    public function show(Request $request, string $month, SeasonCalendar $calendar): Response
    {
        $number = $calendar->month($month) ?? abort(404);

        $products = Product::query()
            ->published()
            ->withCardData()
            ->seasonal($number)
            ->latest()
            // Products added in the same second keep one order from page to page.
            ->orderByDesc('products.id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        $name = $calendar->name($number);
        $withProducts = $calendar->monthsWithProducts();

        return Inertia::render('marketplace/season', [
            'meta' => PageMeta::make(
                __('U sezoni: :month | Vrelina juga', ['month' => $name]),
                __('Domaći proizvodi kojima je sezona u mesecu :month, direktno od proizvođača sa juga Srbije.', ['month' => $name]),
            ),
            'month' => $number,
            'isCurrent' => $number === now()->month,
            'months' => collect(SeasonCalendar::SLUGS)
                ->map(fn (string $slug, int $each) => ['number' => $each, 'slug' => $slug, 'has_products' => in_array($each, $withProducts, true)])
                ->values(),
            'products' => $products->through(ProductCards::for($request->user(), $products)),
        ]);
    }
}
