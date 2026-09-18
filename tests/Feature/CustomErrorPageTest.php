<?php

namespace Tests\Feature;

use App\Models\Producer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomErrorPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_branded_404_page_is_shown_for_a_missing_producer()
    {
        config(['app.debug' => false]);
        $producer = Producer::factory()->create(['status' => 'pending']);

        $response = $this->get(route('marketplace.producers.show', $producer));

        $response->assertNotFound();
        $response->assertSee('Vrelina juga', false);
        $response->assertSee('Ova stranica ne postoji.');
    }
}
