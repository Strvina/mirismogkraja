<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * The places producers sell from, as pages of their own (/mesto/nis).
 *
 * A producer types their town, so there is no table of places: a place is
 * every spelling of a town that shortens to the same address - "Niš" and
 * "Nis" are one page - and it exists only while something published is sold
 * from it, so no page is ever empty.
 *
 * Working that out reads the whole catalogue, and it is the same for every
 * visitor, so it is done once every few minutes.
 *
 * @phpstan-type Place array{slug: string, name: string, spellings: list<string>, products: int, categories: array<int, int>}
 */
class Places
{
    private const CACHE_KEY = 'places:v2';

    private const CACHE_SECONDS = 600;

    /**
     * Every place with published products, by name.
     *
     * @return array<string, Place>
     */
    public function all(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_SECONDS, function () {
            $rows = Product::query()
                ->published()
                ->join('producers', 'producers.id', '=', 'products.producer_id')
                ->whereNotNull('producers.city')
                ->groupBy('producers.city', 'products.category_id')
                ->toBase()
                ->selectRaw('producers.city as city, products.category_id as category_id, count(*) as products')
                ->get();

            // A product filed under a subcategory counts for the category
            // above it too: ajvar from Leskovac is zimnica from Leskovac.
            $parents = Category::whereNotNull('parent_id')->pluck('parent_id', 'id');
            $rows = $rows->concat($rows
                ->filter(fn (object $row) => isset($parents[$row->category_id]))
                ->map(fn (object $row) => (object) ['city' => $row->city, 'category_id' => $parents[$row->category_id], 'products' => $row->products, 'rolledUp' => true]));

            $places = [];

            foreach ($rows->groupBy(fn (object $row) => Str::slug($row->city)) as $slug => $group) {
                if ($slug === '') {
                    continue;
                }

                // Counted once each: without the rows repeated for a parent category.
                $own = $group->filter(fn (object $row) => ! isset($row->rolledUp));
                $bySpelling = $own->groupBy('city')->map(fn ($spelling) => (int) $spelling->sum('products'))->sortDesc();

                $places[$slug] = [
                    'slug' => $slug,
                    // The spelling most of its products carry.
                    'name' => trim((string) $bySpelling->keys()->first()),
                    'spellings' => $bySpelling->keys()->map(fn ($spelling) => (string) $spelling)->all(),
                    'products' => (int) $own->sum('products'),
                    'categories' => $group->groupBy('category_id')->map(fn ($category) => (int) $category->sum('products'))->all(),
                ];
            }

            uasort($places, fn (array $a, array $b) => strcoll($a['name'], $b['name']));

            return $places;
        });
    }

    /** @return Place|null */
    public function find(string $slug): ?array
    {
        return $this->all()[$slug] ?? null;
    }

    /**
     * The place a town belongs to, for linking a producer's town to its
     * page - null when nothing published is sold from there yet.
     *
     * @return array{slug: string, name: string}|null
     */
    public function forCity(?string $city): ?array
    {
        $place = filled($city) ? $this->find(Str::slug($city)) : null;

        return $place ? ['slug' => $place['slug'], 'name' => $place['name']] : null;
    }

    /**
     * The categories something is sold in from this place, each
     * subcategory under its parent.
     *
     * @param  Place  $place
     * @return Collection<int, Category>
     */
    public function categoriesIn(array $place): Collection
    {
        return Category::inTreeOrder(
            Category::whereKey(array_keys($place['categories']))->orderBy('name')->get(['id', 'name', 'slug', 'parent_id'])
        );
    }

    /**
     * The places a category is sold from.
     *
     * @return list<array{slug: string, name: string}>
     */
    public function withCategory(Category $category): array
    {
        return collect($this->all())
            ->filter(fn (array $place) => isset($place['categories'][$category->id]))
            ->map(fn (array $place) => ['slug' => $place['slug'], 'name' => $place['name']])
            ->values()
            ->all();
    }
}
