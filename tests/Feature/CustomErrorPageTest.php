<?php

namespace Tests\Feature;

use App\Models\Household;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomErrorPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_branded_404_page_is_shown_for_a_missing_household()
    {
        config(['app.debug' => false]);
        $household = Household::factory()->create(['status' => 'pending']);

        $response = $this->get(route('marketplace.households.show', $household));

        $response->assertNotFound();
        $response->assertSee('Vrelina juga', false);
        $response->assertSee('Ova stranica ne postoji.');
    }
}
