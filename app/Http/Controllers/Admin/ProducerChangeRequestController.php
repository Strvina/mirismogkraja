<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProducerChangeRequest;
use App\Notifications\SiteNotification;
use App\Services\ProducerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The queue of changes producers may ask for but not make themselves
 * (task 15). Today that is only a rename of an already-published producer;
 * the table stores field and value, so widening that line later needs no
 * new screen.
 */
class ProducerChangeRequestController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();

        if (! in_array($status, ProducerChangeRequest::STATUSES, true)) {
            $status = ProducerChangeRequest::STATUS_PENDING;
        }

        return Inertia::render('admin/change-requests/index', [
            'requests' => ProducerChangeRequest::with(['producer:id,name,slug', 'requester:id,name'])
                ->where('status', $status)
                ->oldest()
                ->get(),
            'filters' => ['status' => $status],
            'counts' => collect(ProducerChangeRequest::STATUSES)
                ->mapWithKeys(fn (string $value) => [$value => ProducerChangeRequest::where('status', $value)->count()])
                ->all(),
        ]);
    }

    /**
     * Apply the change and tell the producer. The value is written straight
     * to the model rather than back through the update service, which would
     * only set it aside as a request again.
     */
    public function approve(Request $request, ProducerChangeRequest $changeRequest, ProducerService $producers): RedirectResponse
    {
        $producer = $changeRequest->producer;

        $producers->applyApprovedChange($producer, $changeRequest->field, $changeRequest->requested_value);

        $changeRequest->update([
            'status' => ProducerChangeRequest::STATUS_APPROVED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        $producer->user?->notify(SiteNotification::changeRequestApproved(
            $changeRequest->requested_value,
            route('marketplace.producers.show', $producer->slug),
        ));

        return back();
    }

    public function reject(Request $request, ProducerChangeRequest $changeRequest): RedirectResponse
    {
        $changeRequest->update([
            'status' => ProducerChangeRequest::STATUS_REJECTED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        $changeRequest->producer->user?->notify(SiteNotification::changeRequestRejected(
            $changeRequest->requested_value,
            route('producers.index'),
        ));

        return back();
    }
}
