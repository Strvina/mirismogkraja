<?php

namespace App\Support;

/**
 * A price as the site writes it in a sentence: "1.200", and "804,15" only
 * when there really are paras. The pages format prices in the browser; this
 * is for text the server writes itself - a page's description.
 */
class Price
{
    public static function format(float|string $price): string
    {
        $price = (float) $price;

        return number_format($price, fmod($price, 1.0) === 0.0 ? 0 : 2, ',', '.');
    }
}
