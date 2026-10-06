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
        // The address stays as it was made: a renamed category keeps the
        // page search engines and shared links already point to.
        $category->update($attributes);

        return $category;
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $suffix = 1;

        while (Category::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
