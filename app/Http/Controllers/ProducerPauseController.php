<?php

namespace App\Http\Controllers;

use App\Jobs\NotifyFollowersOfResume;
use App\Models\Producer;
use App\Services\ProducerPause;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/** The owner's switch for a pause: on with an optional return date and note, or off. */
class ProducerPauseController extends Controller
{
    /** A return date further out than this is not a pause, it is a closed page. */
    public const MAX_DAYS = 365;

    public function edit(Producer $producer): Response
    {
        $this->authorize('update', $producer);

        return Inertia::render('producers/pause', [
            'producer' => $producer->only(['id', 'name']),
            'pause' => [
                'paused' => $producer->isPaused(),
                'until' => $producer->isPaused() ? $producer->paused_until?->toDateString() : null,
                'note' => $producer->isPaused() ? $producer->pause_note : null,
            ],
            'followersCount' => $producer->followers()->count(),
            'maxDate' => today()->addDays(self::MAX_DAYS)->toDateString(),
        ]);
    }

    public function update(Request $request, Producer $producer, ProducerPause $pause): RedirectResponse
    {
        $this->authorize('update', $producer);

        $data = $request->validate([
            'paused' => ['required', 'boolean'],
            'until' => ['nullable', 'date', 'after_or_equal:today', 'before_or_equal:'.today()->addDays(self::MAX_DAYS)->toDateString()],
            'note' => ['nullable', 'string', 'max:200'],
        ]);

        if ($data['paused']) {
            $pause->pause($producer, filled($data['until'] ?? null) ? Carbon::parse($data['until']) : null, $data['note'] ?? null);

            return back()->with('status', __('Pauza je uključena. Stranica ostaje vidljiva, a novi upiti čekaju dok se ne vratite.'));
        }

        $wasPaused = $producer->isPaused();
        $pause->resume($producer);

        if ($wasPaused) {
            NotifyFollowersOfResume::dispatchAfterResponse($producer);
        }

        return back()->with('status', __('Pauza je isključena. Ponovo primate upite.'));
    }
}
