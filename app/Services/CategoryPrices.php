<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Support\Price;
use Illuminate\Support\Facades\Cache;

/**
 * What a category's products cost right now.
 *
 * "Domaći ajvar cena" is typed more often than "domaći ajvar": people want
 * the number before they want a producer. The site has it - every listing
 * carries a price - so a category's page says what the range is, from the
 * listings themselves and nothing else.
 *
 * Per unit of measure, because a price per kilogram and a price per piece
 * are not one range. The same for every visitor and slow to change, so it
 * is worked out once every few minutes.
 *
 * @phpstan-type PriceRange array{unit: string, from: float, to: float, products: int}
 */
class CategoryPrices
{
    private const CACHE_SECONDS = 600;

    /** The units most of the category is sold by; the rest would be noise. */
    private const UNITS_SHOWN = 3;

    /**
     * The price range for each unit the category is sold by, the most
     * common unit first. Subcategories count for their parent.
     *
     * @return list<PriceRange>
     */
    public function for(Category $category): array
    {
        return Cache::remember("category-prices:{$category->id}", self::CACHE_SECONDS, fn () => Product::query()
            ->published()
            ->inCategory($category->id)
            ->toBase()
            ->groupBy('unit')
            ->selectRaw('unit, min(price) as lowest, max(price) as highest, count(*) as products')
            ->orderByDesc('products')
            ->orderBy('unit')
            ->limit(self::UNITS_SHOWN)
            ->get()
            ->map(fn (object $row) => [
                'unit' => (string) $row->unit,
                'from' => (float) $row->lowest,
                'to' => (float) $row->highest,
                'products' => (int) $row->products,
            ])
            ->all());
    }

    /**
     * The most common unit's range in a few characters, for a description:
     * "550–800 RSD/kg". Null while nothing is listed.
     */
    public function summary(Category $category): ?string
    {
        $range = $this->for($category)[0] ?? null;

        if ($range === null) {
            return null;
        }

        $prices = $range['from'] === $range['to']
            ? Price::format($range['from'])
            : Price::format($range['from']).'–'.Price::format($range['to']);

        return "{$prices} RSD/{$range['unit']}";
    }
}
