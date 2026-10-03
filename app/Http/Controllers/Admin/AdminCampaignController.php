<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\CampaignParticipant;
use App\Notifications\SiteNotification;
use App\Services\CancellationService;
use App\Support\UniqueSlug;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Seasonal campaigns in the admin panel (task 20.3): creating and editing
 * them on the settings tab, and the producers who paid to join, by status,
 * on the others.
 */
class AdminCampaignController extends Controller
{
    /**
     * A place has no "expired" status of its own: it is over when its
     * campaign is, so "ended" is an active place in a finished campaign.
     */
    private const TABS = ['settings', CampaignParticipant::STATUS_PENDING, CampaignParticipant::STATUS_ACTIVE, 'ended', CampaignParticipant::STATUS_CANCELLED];

    public function index(Request $request, CancellationService $cancellations): Response
    {
        $status = $request->string('status')->toString();

        if (! in_array($status, self::TABS, true)) {
            $status = CampaignParticipant::STATUS_PENDING;
        }

        return Inertia::render('admin/campaigns/index', [
            'filters' => ['status' => $status],
            'counts' => $this->counts(),
            // Only the open tab's data is loaded: the places, or the campaigns.
            'campaigns' => $status === 'settings' ? Campaign::query()
                ->withCount([
                    'participants as active_count' => fn ($query) => $query->where('status', CampaignParticipant::STATUS_ACTIVE),
                    'participants as pending_count' => fn ($query) => $query->where('status', CampaignParticipant::STATUS_PENDING),
                ])
                ->orderByDesc('starts_on')
                ->paginate(20)
                ->withQueryString() : null,
            'places' => $status === 'settings' ? null : $this->places($status)
                ->with(['campaign:id,name,slug,starts_on,ends_on', 'producer:id,name,slug'])
                ->latest()
                ->paginate(30)
                ->withQueryString()
                ->through(fn (CampaignParticipant $place) => [
                    'id' => $place->id,
                    'status' => $place->status,
                    'reference' => $place->reference,
                    'amount_rsd' => $place->amount_rsd,
                    'created_at' => $place->created_at,
                    'campaign' => $place->campaign?->only(['id', 'name', 'slug', 'starts_on', 'ends_on']),
                    'producer' => $place->producer?->only(['id', 'name', 'slug']),
                    ...$cancellations->adminFields($place),
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        Campaign::create([...$data, 'slug' => UniqueSlug::for(Campaign::class, $data['name'])]);

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
        // Straight to the campaign's page, where the producer now is.
        $participant->producer->user?->notify(SiteNotification::campaignJoined(
            $participant->campaign->name,
            route('campaigns.show', $participant->campaign->slug),
        ));

        return back();
    }

    /** @return Builder<CampaignParticipant> */
    private function places(string $tab): Builder
    {
        $running = fn (Builder $query) => $query->whereDate('ends_on', '>=', today());

        return match ($tab) {
            CampaignParticipant::STATUS_ACTIVE => CampaignParticipant::where('status', $tab)->whereHas('campaign', $running),
            'ended' => CampaignParticipant::where('status', CampaignParticipant::STATUS_ACTIVE)->whereDoesntHave('campaign', $running),
            default => CampaignParticipant::where('status', $tab),
        };
    }

    /** @return array<string, int> */
    private function counts(): array
    {
        $byStatus = CampaignParticipant::countsByStatus();
        $running = CampaignParticipant::where('status', CampaignParticipant::STATUS_ACTIVE)
            ->whereHas('campaign', fn (Builder $query) => $query->whereDate('ends_on', '>=', today()))
            ->count();

        return [
            CampaignParticipant::STATUS_PENDING => $byStatus[CampaignParticipant::STATUS_PENDING],
            CampaignParticipant::STATUS_ACTIVE => $running,
            'ended' => $byStatus[CampaignParticipant::STATUS_ACTIVE] - $running,
            CampaignParticipant::STATUS_CANCELLED => $byStatus[CampaignParticipant::STATUS_CANCELLED],
        ];
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
}
