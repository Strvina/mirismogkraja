<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\CampaignParticipant;
use App\Notifications\SiteNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Seasonal campaigns in the admin panel (task 20.3): creating them, and
 * confirming the producers who paid to join.
 */
class AdminCampaignController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/campaigns/index', [
            'campaigns' => Campaign::query()
                ->withCount([
                    'participants as active_count' => fn ($query) => $query->where('status', CampaignParticipant::STATUS_ACTIVE),
                    'participants as pending_count' => fn ($query) => $query->where('status', CampaignParticipant::STATUS_PENDING),
                ])
                ->orderByDesc('starts_on')
                ->paginate(20),
            // Every unpaid place across campaigns - the admin's to-do list.
            'pending' => CampaignParticipant::query()
                ->where('status', CampaignParticipant::STATUS_PENDING)
                ->with(['campaign:id,name', 'producer:id,name,slug'])
                ->oldest()
                ->limit(100)
                ->get(['id', 'campaign_id', 'household_id', 'reference', 'amount_rsd', 'created_at']),
            // Places that are running, asked-to-cancel first - so the admin
            // can deactivate one, on request or otherwise.
            'active' => CampaignParticipant::query()
                ->where('status', CampaignParticipant::STATUS_ACTIVE)
                ->whereHas('campaign', fn ($query) => $query->whereDate('ends_on', '>=', today()))
                ->with(['campaign:id,name', 'producer:id,name,slug'])
                ->orderByRaw('cancel_requested_at is null')
                ->latest('confirmed_at')
                ->limit(100)
                ->get(['id', 'campaign_id', 'household_id', 'reference', 'amount_rsd', 'created_at', 'cancel_requested_at']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        Campaign::create([...$data, 'slug' => $this->uniqueSlug($data['name'])]);

        return back();
    }

    /** The address stays as it was: it may already be shared. */
    public function update(Request $request, Campaign $campaign): RedirectResponse
    {
        $campaign->update($this->validated($request));

        return back();
    }

    public function confirm(Request $request, CampaignParticipant $participant): RedirectResponse
    {
        abort_unless($participant->status === CampaignParticipant::STATUS_PENDING, 422);

        $participant->update([
            'status' => CampaignParticipant::STATUS_ACTIVE,
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
        ]);

        $participant->loadMissing(['campaign', 'producer.user']);
        $participant->producer->user?->notify(SiteNotification::campaignJoined(
            $participant->campaign->name,
            route('campaigns.show', $participant->campaign->slug),
        ));

        return back();
    }

    /** Cancel an unpaid place, or deactivate a running one; see AdminMembershipController::cancel(). */
    public function cancel(CampaignParticipant $participant): RedirectResponse
    {
        $wasActive = $participant->status === CampaignParticipant::STATUS_ACTIVE;

        $participant->update(['status' => CampaignParticipant::STATUS_CANCELLED]);

        if ($wasActive) {
            $participant->loadMissing(['campaign', 'producer.user']);
            $participant->producer?->user?->notify(SiteNotification::paidItemCancelled(
                'Učešće u kampanji '.$participant->campaign->name,
                route('campaigns.index'),
            ));
        }

        return back();
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:2000'],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['required', 'date', 'after_or_equal:starts_on'],
            'price_rsd' => ['required', 'integer', 'min:0', 'max:1000000'],
            'is_active' => ['required', 'boolean'],
        ]);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $suffix = 1;

        while (Campaign::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$suffix++;
        }

        return $slug;
    }
}
