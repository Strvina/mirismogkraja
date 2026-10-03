<?php

namespace App\Support;

use App\Models\Producer;

/**
 * How complete a producer's page is - "Profil je popunjen 70%" and what
 * would finish it. Each item is something buyers look for before writing:
 * a face (logo), a place (city, map pin), a story, a way to get the goods.
 *
 * Reads the producer's own columns plus two counts, which the caller is
 * expected to have loaded (withCount: active_products_count, images_count).
 */
final class ProfileCompleteness
{
    /** A description shorter than this says little more than the name. */
    private const MIN_DESCRIPTION = 80;

    private const MIN_PRODUCTS = 3;

    private const MIN_PHOTOS = 3;

    /**
     * @return array{percent: int, missing: list<array{key: string, label: string, href: string}>}
     */
    public static function for(Producer $producer): array
    {
        $edit = route('producers.edit', $producer);

        $checks = [
            'logo' => [filled($producer->logo_path), 'Logo ili vaša fotografija', $edit],
            'cover' => [filled($producer->cover_image_path), 'Naslovna fotografija', $edit],
            'description' => [mb_strlen((string) $producer->description) >= self::MIN_DESCRIPTION, 'Opis od bar par rečenica', $edit],
            'story' => [filled($producer->story), 'Vaša priča', $edit],
            'location' => [filled($producer->city) && $producer->lat !== null && $producer->lng !== null, 'Mesto i lokacija na mapi', $edit],
            'contact' => [filled($producer->phone) || filled($producer->contact_email), 'Telefon ili e-mail za kontakt', $edit],
            'delivery' => [! empty($producer->delivery_methods), 'Načini dostave', $edit],
            'photos' => [(int) $producer->images_count >= self::MIN_PHOTOS, 'Bar 3 fotografije u galeriji', $edit],
            'products' => [(int) $producer->active_products_count >= self::MIN_PRODUCTS, 'Bar 3 objavljena proizvoda', route('producers.products.create', $producer)],
        ];

        $missing = [];

        foreach ($checks as $key => [$done, $label, $href]) {
            if (! $done) {
                $missing[] = ['key' => $key, 'label' => __($label), 'href' => $href];
            }
        }

        return [
            'percent' => (int) round(100 * (count($checks) - count($missing)) / count($checks)),
            'missing' => $missing,
        ];
    }
}
