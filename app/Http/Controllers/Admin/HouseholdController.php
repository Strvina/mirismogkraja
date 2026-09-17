<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Household;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HouseholdController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/households/index', [
            'households' => Household::with('user:id,name')->orderByDesc('created_at')->get(),
        ]);
    }

    /**
     * Admin sets a household's status directly (approve pending -> active,
     * or block/unblock) - bypasses HouseholdPolicy's owner-only rules.
     */
    public function updateStatus(Request $request, Household $household): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', 'in:pending,active,blocked']]);

        $household->update($data);

        return back();
    }
}
