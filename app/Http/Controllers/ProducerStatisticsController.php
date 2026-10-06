<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Services\InquiryExport;
use App\Services\ProducerStatistics;
use App\Services\SearchMisses;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

use function Illuminate\Support\defer;

class ProducerStatisticsController extends Controller
{
    /**
     * The owner's dashboard. Its numbers are part of the Premium and Pro
     * plans; below them the page still opens, as a locked preview that says
     * what the plan would show - and sends none of the real figures.
     */
    public function show(Producer $producer, ProducerStatistics $statistics, SubscriptionService $subscriptions, SearchMisses $misses): Response
    {
        $this->authorize('update', $producer);

        $unlocked = $subscriptions->hasFeature($producer, 'statistics');

        return Inertia::render('producers/statistics', [
            'producer' => $producer->only(['id', 'name', 'slug']),
            'unlocked' => $unlocked,
            'stats' => $unlocked ? $statistics->summary($producer) : null,
            // "Kupci traže, a niko ne nudi": part of the same plans. Only
            // terms more than one person searched for, so nobody's one-off
            // query is passed around.
            'wanted' => $unlocked ? $misses->top(30, 10, SearchMisses::SHARED_FROM) : null,
            'clickLabels' => array_map(__(...), ProducerStatistics::CLICKS),
        ]);
    }

    /**
     * The producer's inquiries as a CSV file, part of the same plans as the
     * statistics. Semicolons and a byte-order mark: that is what Excel in a
     * Serbian locale opens straight into columns, with š and đ intact.
     */
    public function exportInquiries(Producer $producer, SubscriptionService $subscriptions, InquiryExport $export): StreamedResponse
    {
        $this->authorize('update', $producer);
        abort_unless($subscriptions->hasFeature($producer, 'statistics'), 403);

        $rows = [$export->headings(), ...$export->rows($producer)];

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");

            foreach ($rows as $row) {
                fputcsv($out, $row, ';', '"', '');
            }

            fclose($out);
        }, 'upiti-'.$producer->slug.'-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
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
