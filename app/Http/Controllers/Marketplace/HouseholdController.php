<?php

namespace App\Http\Controllers\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\Household;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class HouseholdController extends Controller
{
    /**
     * Show a household's public page. Only 'active' households (approved by
     * an admin, task 2.6) are publicly visible - pending/blocked ones 404.
     */
    public function show(Household $household): Response
    {
        if ($household->status !== 'active') {
            throw new NotFoundHttpException;
        }

        return Inertia::render('marketplace/households/show', [
            'household' => $household,
            // Products and reviews are wired in once those models exist
            // (task 3.3 and task 5.1).
        ]);
    }
}
