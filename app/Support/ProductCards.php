<?php

namespace App\Support;

use App\Models\Product;
use App\Models\User;
use Closure;

/**
 * A product as a list sends it to the page: the card's own columns, and
 * whether the reader has saved it.
 *
 * Every public list of products - the catalogue, a category, a place, a
 * month - draws the same card, heart included. Which products the reader
 * has saved is one query however long the list is, and none for a guest -
 * asked about the products on the page only, not about everything the
 * reader ever saved.
 */
final class ProductCards
{
    /**
     * What turns each product of a list into its card, for this reader.
     *
     * @param  iterable<int, Product>  ...$lists  the products about to be shown
     * @return Closure(Product): array<string, mixed>
     */
    public static function for(?User $reader, iterable ...$lists): Closure
    {
        // Spread, not collect(): a paginator turned into a collection is its
        // page numbers and links, not its products.
        $shown = collect($lists)->flatMap(fn (iterable $list) => array_map(fn (Product $product) => $product->id, [...$list]));

        $saved = $reader === null || $shown->isEmpty() ? collect() : $reader->favorites()
            ->where('favoritable_type', 'product')
            ->whereIn('favoritable_id', $shown)
            ->pluck('favoritable_id');

        return fn (Product $product) => [
            ...$product->toArray(),
            'is_favorited' => $saved->contains($product->id),
        ];
    }
}
