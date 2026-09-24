<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Following a producer (task 20.5): a standing request to hear when they
 * list something new. Distinct from a favourite, which is a bookmark and
 * says nothing about wanting to be told.
 */
class ProducerFollowController extends Controller
{
    public function toggle(Request $request, Producer $producer): RedirectResponse
    {
        abort_unless($producer->status === 'active', 404);

        // Their own page has nothing to tell them.
        abort_if($producer->user_id === $request->user()->id, 403);

        $request->user()->followedProducers()->toggle($producer);

        return back();
    }
}
