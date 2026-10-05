<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProducerCertificate;
use App\Notifications\SiteNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Checking producers' documents. A certificate is a claim the site repeats
 * to every visitor, so nothing is shown until someone has opened the
 * document and seen that it says what the producer says it does.
 */
class CertificateController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();

        if (! in_array($status, ProducerCertificate::STATUSES, true)) {
            $status = ProducerCertificate::STATUS_PENDING;
        }

        return Inertia::render('admin/certificates/index', [
            'certificates' => ProducerCertificate::query()
                ->with('producer:id,name,slug,deleted_at')
                ->where('status', $status)
                // The queue is worked oldest first; the other tabs read as a history.
                ->orderBy('created_at', $status === ProducerCertificate::STATUS_PENDING ? 'asc' : 'desc')
                ->paginate(30)
                ->withQueryString()
                ->through(fn (ProducerCertificate $certificate) => [
                    // Through toArray(), so the two dates stay plain days
                    // rather than midnight in some time zone.
                    ...Arr::only($certificate->toArray(), ['id', 'producer_id', 'type', 'title', 'issuer', 'issued_on', 'expires_on', 'status', 'rejection_reason', 'created_at']),
                    'expired' => $certificate->isExpired(),
                    'producer' => $certificate->producer?->only(['id', 'name', 'slug']),
                ]),
            'types' => array_map(__(...), ProducerCertificate::TYPES),
            'filters' => ['status' => $status],
            'counts' => ProducerCertificate::countsByStatus(),
        ]);
    }

    public function approve(Request $request, ProducerCertificate $certificate): RedirectResponse
    {
        $wasApproved = $certificate->status === ProducerCertificate::STATUS_APPROVED;

        $certificate->update([
            'status' => ProducerCertificate::STATUS_APPROVED,
            'rejection_reason' => null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        if (! $wasApproved) {
            $certificate->producer?->user?->notify(SiteNotification::certificateApproved(
                $certificate->title,
                route('marketplace.producers.show', $certificate->producer->slug),
            ));
        }

        return back();
    }

    /** Turned down with a reason, so the producer knows what to send instead. */
    public function reject(Request $request, ProducerCertificate $certificate): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        $wasRejected = $certificate->status === ProducerCertificate::STATUS_REJECTED;

        $certificate->update([
            'status' => ProducerCertificate::STATUS_REJECTED,
            'rejection_reason' => $data['reason'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        if (! $wasRejected) {
            $certificate->producer?->user?->notify(SiteNotification::certificateRejected(
                $certificate->title,
                $data['reason'],
                route('producers.certificates.index', $certificate->producer_id),
            ));
        }

        return back();
    }
}
