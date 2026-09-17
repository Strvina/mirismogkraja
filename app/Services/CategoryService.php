<?php

namespace App\Services;

use App\Models\Category;
use Illuminate\Support\Str;

class CategoryService
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): Category
    {
        return Category::create([
            ...$attributes,
            'slug' => $this->uniqueSlug($attributes['name']),
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(Category $category, array $attributes): Category
    {
        if ($attributes['name'] !== $category->name) {
            $attributes['slug'] = $this->uniqueSlug($attributes['name'], ignore: $category);
        }

        $category->update($attributes);

        return $category;
    }

    private function uniqueSlug(string $name, ?Category $ignore = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $suffix = 1;

        while (
            Category::where('slug', $slug)
                ->when($ignore, fn ($query) => $query->whereKeyNot($ignore))
                ->exists()
        ) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
