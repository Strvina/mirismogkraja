<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;
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
    private const CACHE_KEY = 'places:v1';

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

            $places = [];

            foreach ($rows->groupBy(fn (object $row) => Str::slug($row->city)) as $slug => $group) {
                if ($slug === '') {
                    continue;
                }

                $bySpelling = $group->groupBy('city')->map(fn ($spelling) => (int) $spelling->sum('products'))->sortDesc();

                $places[$slug] = [
                    'slug' => $slug,
                    // The spelling most of its products carry.
                    'name' => trim((string) $bySpelling->keys()->first()),
                    'spellings' => $bySpelling->keys()->map(fn ($spelling) => (string) $spelling)->all(),
                    'products' => (int) $group->sum('products'),
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
     * The categories something is sold in from this place.
     *
     * @param  Place  $place
     * @return Collection<int, Category>
     */
    public function categoriesIn(array $place): Collection
    {
        return Category::whereKey(array_keys($place['categories']))->orderBy('name')->get(['id', 'name', 'slug']);
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
