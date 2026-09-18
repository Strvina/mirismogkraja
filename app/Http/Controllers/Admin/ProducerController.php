<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Producer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProducerController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/producers/index', [
            'producers' => Producer::with('user:id,name')->orderByDesc('created_at')->get(),
        ]);
    }

    /**
     * Admin sets a producer's status directly (approve pending -> active,
     * or block/unblock) - bypasses ProducerPolicy's owner-only rules.
     */
    public function updateStatus(Request $request, Producer $producer): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', 'in:pending,active,blocked']]);

        $producer->update($data);

        return back();
    }
}
