<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Models\CampaignParticipant;
use App\Models\Producer;
use App\Models\User;
use App\Services\PaymentSlipService;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Seasonal campaigns (task 20.3). */
class CampaignTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        return $admin;
    }

    private function campaign(array $attributes = []): Campaign
    {
        return Campaign::create([
            'name' => 'Ajvar sezona',
            'slug' => 'ajvar-sezona',
            'starts_on' => today()->subDay(),
            'ends_on' => today()->addWeeks(3),
            'price_rsd' => 2490,
            'is_active' => true,
            ...$attributes,
        ]);
    }

    public function test_the_admin_creates_a_campaign_and_it_is_announced_while_it_runs(): void
    {
        $this->actingAs($this->admin())->post(route('admin.campaigns.store'), [
            'name' => 'Ajvar sezona',
            'description' => 'Paprika je stigla.',
            'starts_on' => today()->toDateString(),
            'ends_on' => today()->addWeeks(4)->toDateString(),
            'price_rsd' => 2490,
            'is_active' => true,
        ])->assertSessionHasNoErrors();

        $campaign = Campaign::sole();
        $this->assertSame('ajvar-sezona', $campaign->slug);

        $this->get('/')->assertInertia(fn ($page) => $page->where('campaigns.0.slug', 'ajvar-sezona'));
        $this->get(route('campaigns.show', 'ajvar-sezona'))->assertOk();
    }

    /** A draft is nobody's business, and a finished one is over. */
    public function test_drafts_and_finished_campaigns_are_not_shown(): void
    {
        $this->campaign(['is_active' => false]);
        $this->campaign(['slug' => 'zimnica', 'starts_on' => today()->subMonth(), 'ends_on' => today()->subDay()]);

        $this->get('/')->assertInertia(fn ($page) => $page->has('campaigns', 0));
        $this->get(route('campaigns.show', 'ajvar-sezona'))->assertNotFound();
    }

    public function test_a_producer_joins_pays_by_slip_and_appears_once_confirmed(): void
    {
        $campaign = $this->campaign();
        $producer = Producer::factory()->active()->create(['name' => 'Ajvar kod Mile']);

        $this->actingAs($producer->user)->post(route('campaigns.join', $campaign), ['producer_id' => $producer->id])->assertSessionHasNoErrors();
        // Asking again while unpaid hands back the same place.
        $this->actingAs($producer->user)->post(route('campaigns.join', $campaign), ['producer_id' => $producer->id]);

        $place = CampaignParticipant::sole();
        $this->assertSame(2490, $place->amount_rsd);
        $this->assertSame('Kampanja Ajvar sezona - Ajvar kod Mile', app(PaymentSlipService::class)->detailsFor($place)['purpose']);
        $this->actingAs($producer->user)->get(route('campaigns.slip', $place))->assertOk()->assertHeader('content-type', 'application/pdf');

        // Not on the page until the money is in.
        $this->get(route('campaigns.show', $campaign->slug))->assertInertia(fn ($page) => $page->has('producers', 0));

        $this->actingAs($this->admin())->patch(route('admin.campaigns.confirm', $place))->assertRedirect();

        $this->get(route('campaigns.show', $campaign->slug))->assertInertia(fn ($page) => $page->where('producers.0.name', 'Ajvar kod Mile'));
        $this->assertContains('campaign.joined', $producer->user->notifications()->get()->pluck('data.type'));

        $this->actingAs($producer->user)->post(route('campaigns.join', $campaign), ['producer_id' => $producer->id])
            ->assertSessionHasErrors('producer_id');
    }

    public function test_only_your_own_published_producer_can_join_an_open_campaign(): void
    {
        $campaign = $this->campaign();
        $someoneElses = Producer::factory()->active()->create();
        $pending = Producer::factory()->create(['status' => 'pending']);
        $finished = $this->campaign(['slug' => 'zimnica', 'starts_on' => today()->subMonth(), 'ends_on' => today()->subDay()]);

        $this->actingAs(User::factory()->create())->post(route('campaigns.join', $campaign), ['producer_id' => $someoneElses->id])->assertForbidden();
        $this->actingAs($pending->user)->post(route('campaigns.join', $campaign), ['producer_id' => $pending->id])->assertNotFound();
        $this->actingAs($someoneElses->user)->post(route('campaigns.join', $finished), ['producer_id' => $someoneElses->id])->assertNotFound();

        $this->assertSame(0, CampaignParticipant::count());
    }
}
