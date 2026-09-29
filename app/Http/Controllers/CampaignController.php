<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\CampaignParticipant;
use App\Models\Producer;
use App\Services\PaymentSlipPdf;
use App\Services\PaymentSlipService;
use App\Services\SubscriptionService;
use App\Support\PageMeta;
use App\Support\PaymentReference;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

/**
 * Seasonal campaigns (task 20.3): the public campaign page, and a producer
 * joining one.
 */
class CampaignController extends Controller
{
    /** The campaign's page: what it is, and the producers taking part. */
    public function show(Campaign $campaign, SubscriptionService $subscriptions): Response
    {
        abort_unless($campaign->is_active, 404);

        $producers = Producer::published()
            ->withCardData()
            ->whereIn('id', $campaign->participants()->where('status', CampaignParticipant::STATUS_ACTIVE)->select('household_id'))
            ->orderBy('name')
            ->get();

        $subscriptions->markPremium($producers);

        return Inertia::render('campaigns/show', [
            'campaign' => $campaign->only(['id', 'name', 'slug', 'description', 'starts_on', 'ends_on']),
            'producers' => $producers,
            'meta' => PageMeta::make($campaign->name, $campaign->description),
        ]);
    }

    /** A producer's view: campaigns open to join, and their own places. */
    public function index(Request $request, PaymentSlipService $slips): Response
    {
        $producers = $request->user()->producers()->published()->orderBy('name')->get(['id', 'name']);

        $places = CampaignParticipant::query()
            ->whereIn('household_id', $request->user()->producers()->select('id'))
            ->with(['campaign', 'producer.user'])
            ->latest()
            ->get();

        return Inertia::render('campaigns/index', [
            'campaigns' => Campaign::open()->orderBy('starts_on')->get(['id', 'name', 'slug', 'description', 'starts_on', 'ends_on', 'price_rsd']),
            'producers' => $producers,
            'places' => $places->map(fn (CampaignParticipant $place) => [
                'id' => $place->id,
                'campaign_id' => $place->campaign_id,
                'household_id' => $place->household_id,
                'campaign' => $place->campaign->name,
                'producer' => $place->producer->name,
                'status' => $place->status,
                'amount_rsd' => $place->amount_rsd,
                'cancel_requested_at' => $place->cancel_requested_at,
                'slip' => $place->status === CampaignParticipant::STATUS_PENDING ? $slips->detailsFor($place) : null,
                'download_url' => $place->status === CampaignParticipant::STATUS_PENDING ? route('campaigns.slip', $place) : null,
            ]),
        ]);
    }

    /**
     * Join a campaign. One place per producer per campaign: asking again
     * while unpaid hands back the same slip, and a cancelled place can be
     * asked for anew.
     */
    public function join(Request $request, Campaign $campaign): RedirectResponse
    {
        abort_unless(Campaign::open()->whereKey($campaign->id)->exists(), 404);

        $data = $request->validate(['producer_id' => ['required', 'integer']]);
        $producer = Producer::published()->findOrFail($data['producer_id']);
        $this->authorize('update', $producer);

        $place = CampaignParticipant::firstOrNew(['campaign_id' => $campaign->id, 'household_id' => $producer->id]);

        if ($place->status === CampaignParticipant::STATUS_ACTIVE) {
            throw ValidationException::withMessages(['producer_id' => "„{$producer->name}” već učestvuje u ovoj kampanji."]);
        }

        if ($place->status !== CampaignParticipant::STATUS_PENDING) {
            $place->fill([
                'status' => CampaignParticipant::STATUS_PENDING,
                'reference' => PaymentReference::generate(),
                'amount_rsd' => $campaign->price_rsd,
                'confirmed_by' => null,
                'confirmed_at' => null,
            ])->save();
        }

        return back()->with('status', 'Prijava je zabeležena. Uplatite iznos i mi ćemo vas uključiti u kampanju.');
    }

    public function slip(CampaignParticipant $participant, PaymentSlipPdf $pdf): HttpResponse
    {
        $this->authorize('update', $participant->producer);

        return response($pdf->render($participant), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$pdf->filenameFor($participant).'"',
        ]);
    }
}
