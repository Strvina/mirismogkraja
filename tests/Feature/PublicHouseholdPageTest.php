<?php

namespace Tests\Feature;

use App\Models\Household;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicHouseholdPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_household_page_is_publicly_visible()
    {
        $household = Household::factory()->active()->create(['name' => 'Domaćinstvo Nićić']);

        $this->get(route('marketplace.households.show', $household))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('marketplace/households/show')
                ->where('household.name', 'Domaćinstvo Nićić'));
    }

    public function test_pending_household_page_returns_404()
    {
        $household = Household::factory()->create(['status' => 'pending']);

        $this->get(route('marketplace.households.show', $household))->assertNotFound();
    }

    public function test_blocked_household_page_returns_404()
    {
        $household = Household::factory()->create(['status' => 'blocked']);

        $this->get(route('marketplace.households.show', $household))->assertNotFound();
    }
}
