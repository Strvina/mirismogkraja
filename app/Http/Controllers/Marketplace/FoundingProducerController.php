<?php

namespace App\Http\Controllers\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\Producer;
use App\Services\FoundingProducerService;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The public roll of the founding hundred (task 20.4). It is a brand page as
 * much as a record: these are the producers who listed their goods before
 * anyone was searching for them.
 */
class FoundingProducerController extends Controller
{
    public function __invoke(FoundingProducerService $founding): Response
    {
        return Inertia::render('marketplace/founding', [
            'producers' => Producer::query()
                ->whereNotNull('founding_number')
                ->where('status', 'active')
                ->orderBy('founding_number')
                ->get(['id', 'name', 'slug', 'city', 'description', 'logo_path', 'cover_image_path', 'founding_number', 'founding_joined_at']),
            'claimed' => $founding->claimed(),
            'limit' => FoundingProducerService::LIMIT,
        ]);
    }
}
