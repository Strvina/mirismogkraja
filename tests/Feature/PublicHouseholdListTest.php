<?php

namespace Tests\Feature;

use App\Models\Household;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicHouseholdListTest extends TestCase
{
    use RefreshDatabase;

    public function test_list_only_shows_active_households()
    {
        Household::factory()->active()->create(['name' => 'Aktivno']);
        Household::factory()->create(['name' => 'Na cekanju', 'status' => 'pending']);
        Household::factory()->create(['name' => 'Blokirano', 'status' => 'blocked']);

        $response = $this->get(route('marketplace.households.index'));

        $response->assertInertia(fn ($page) => $page->has('households', 1)
            ->where('households.0.name', 'Aktivno'));
    }

    public function test_list_can_be_filtered_by_city()
    {
        Household::factory()->active()->create(['name' => 'Leskovacko', 'city' => 'Leskovac']);
        Household::factory()->active()->create(['name' => 'Vranjsko', 'city' => 'Vranje']);

        $response = $this->get(route('marketplace.households.index', ['city' => 'Vranje']));

        $response->assertInertia(fn ($page) => $page->has('households', 1)
            ->where('households.0.name', 'Vranjsko'));
    }
}
