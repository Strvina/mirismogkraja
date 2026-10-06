<?php

namespace App\Models;

use Database\Factories\CategoryFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection as SupportCollection;

/**
 * A product category, two levels deep at most: "Zimnica" and, under it,
 * "Ajvar". A product is filed under either - the general one when no
 * subcategory fits - and a category's page lists its subcategories' products
 * along with its own.
 */
class Category extends Model
{
    /** @use HasFactory<CategoryFactory> */
    use HasFactory;

    protected $fillable = [
        'parent_id',
        'name',
        'slug',
        'search_name',
        'intro',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * The category as people search for it ("Domaći ajvar"), for the title
     * and heading of its page; its plain name where none is set.
     */
    public function searchName(): string
    {
        return $this->search_name ?: $this->name;
    }

    /**
     * Top-level categories only.
     *
     * @param  Builder<Category>  $query
     */
    public function scopeRoots(Builder $query): void
    {
        $query->whereNull($query->qualifyColumn('parent_id'));
    }

    /**
     * Categories with something published in them or in a subcategory - the
     * ones whose page is not empty.
     *
     * @param  Builder<Category>  $query
     */
    public function scopeStocked(Builder $query): void
    {
        $query->where(fn (Builder $either) => $either
            ->whereHas('products', fn (Builder $products) => $products->published())
            ->orWhereHas('children.products', fn (Builder $products) => $products->published()));
    }

    /**
     * Every category for a select box, as a tree read top to bottom: each
     * top-level category followed by its subcategories, both by name. The
     * `parent_id` tells the form which rows to indent.
     *
     * @return list<array{id: int, name: string, parent_id: int|null}>
     */
    public static function options(): array
    {
        return static::inTreeOrder(static::query()->orderBy('name')->get(['id', 'name', 'parent_id']))
            ->map(fn (Category $category) => $category->only(['id', 'name', 'parent_id']))
            ->all();
    }

    /**
     * The given categories with each subcategory moved under its parent,
     * keeping the order they came in otherwise. A subcategory whose parent
     * is not among them stays where a top-level one would be.
     *
     * @param  Collection<int, Category>  $categories
     * @return SupportCollection<int, Category>
     */
    public static function inTreeOrder(Collection $categories): SupportCollection
    {
        $present = $categories->keyBy('id');
        $children = $categories->filter(fn (Category $category) => $present->has($category->parent_id))->groupBy('parent_id');

        return $categories
            ->reject(fn (Category $category) => $present->has($category->parent_id))
            ->toBase()
            ->flatMap(fn (Category $root) => [$root, ...($children->get($root->id) ?? [])])
            ->values();
    }
}
