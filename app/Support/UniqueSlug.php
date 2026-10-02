<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * A URL slug not yet taken in a table: "domaci-ajvar", then
 * "domaci-ajvar-1", "domaci-ajvar-2"…
 *
 * One query for the slugs already starting that way, then the first free
 * number is found in memory. Asking "is -1 taken? is -2 taken?" one query at
 * a time cost a query per product that already had the name - hundreds, for
 * a common one like "Domaći ajvar".
 */
final class UniqueSlug
{
    /** @param  class-string<Model>  $model */
    public static function for(string $model, string $name, ?Model $ignore = null): string
    {
        $base = Str::slug($name) ?: 'stavka';

        $taken = $model::query()
            ->withoutGlobalScopes()
            ->where(fn ($query) => $query->where('slug', $base)->orWhere('slug', 'like', str_replace(['%', '_'], ['\\%', '\\_'], $base).'-%'))
            ->when($ignore, fn ($query) => $query->whereKeyNot($ignore->getKey()))
            ->pluck('slug')
            ->flip();

        if (! $taken->has($base)) {
            return $base;
        }

        $suffix = 1;

        while ($taken->has("{$base}-{$suffix}")) {
            $suffix++;
        }

        return "{$base}-{$suffix}";
    }
}
