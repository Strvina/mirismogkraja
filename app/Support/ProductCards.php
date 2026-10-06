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
 * has saved is one query however long the list is, and none for a guest.
 */
final class ProductCards
{
    /**
     * What turns each product of a list into its card, for this reader.
     *
     * @return Closure(Product): array<string, mixed>
     */
    public static function for(?User $reader): Closure
    {
        $saved = $reader?->favorites()
            ->where('favoritable_type', 'product')
            ->pluck('favoritable_id') ?? collect();

        return fn (Product $product) => [
            ...$product->toArray(),
            'is_favorited' => $saved->contains($product->id),
        ];
    }
}
