<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Services\ProducerStatistics;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

use function Illuminate\Support\defer;

class ProducerStatisticsController extends Controller
{
    /**
     * The owner's dashboard. Its numbers are part of the Premium and Pro
     * plans; below them the page still opens, as a locked preview that says
     * what the plan would show - and sends none of the real figures.
     */
    public function show(Producer $producer, ProducerStatistics $statistics, SubscriptionService $subscriptions): Response
    {
        $this->authorize('update', $producer);

        $unlocked = $subscriptions->hasFeature($producer, 'statistics');

        return Inertia::render('producers/statistics', [
            'producer' => $producer->only(['id', 'name', 'slug']),
            'unlocked' => $unlocked,
            'stats' => $unlocked ? $statistics->summary($producer) : null,
            'clickLabels' => array_map(__(...), ProducerStatistics::CLICKS),
        ]);
    }

    /**
     * A contact click, reported by the visitor's browser with sendBeacon.
     *
     * Open to guests and exempt from CSRF: a beacon cannot carry the token,
     * and the only thing a forged request could do is add one to a counter -
     * which the rate limit on the route keeps small. Counted after the
     * response, like views, so the beacon never waits on the database.
     */
    public function click(Request $request, Producer $producer, string $event, ProducerStatistics $statistics): HttpResponse
    {
        abort_unless(array_key_exists($event, ProducerStatistics::CLICKS), 404);
        abort_unless($producer->status === 'active', 404);

        defer(fn () => $statistics->record($request, $producer, $event));

        return response()->noContent();
    }
}
