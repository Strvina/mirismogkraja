<?php

namespace App\Http\Controllers\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\Producer;
use App\Services\FoundingProducerService;
use App\Support\PageMeta;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The public roll of the founding producers. It is a brand page as
 * much as a record: these are the producers who listed their goods before
 * anyone was searching for them.
 */
class FoundingProducerController extends Controller
{
    public function __invoke(FoundingProducerService $founding): Response
    {
        return Inertia::render('marketplace/founding', [
            'meta' => PageMeta::make(
                __('Prvih :count proizvođača', ['count' => $founding->limit()]).' | Vrelina juga',
                __('Proizvođači koji su prvi poverovali u domaću proizvodnju na Vrelini juga.'),
            ),
            'producers' => Producer::published()
                ->whereNotNull('founding_number')
                ->orderBy('founding_number')
                ->get(['id', 'name', 'slug', 'city', 'description', 'logo_path', 'cover_image_path', 'founding_number', 'founding_joined_at']),
            'claimed' => $founding->claimed(),
            'limit' => $founding->limit(),
        ]);
    }
}
