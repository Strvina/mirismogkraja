<?php

namespace Tests\Feature;

use App\Models\Producer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicProducerListTest extends TestCase
{
    use RefreshDatabase;

    public function test_list_only_shows_active_producers()
    {
        Producer::factory()->active()->create(['name' => 'Aktivno']);
        Producer::factory()->create(['name' => 'Na cekanju', 'status' => 'pending']);
        Producer::factory()->create(['name' => 'Blokirano', 'status' => 'blocked']);

        $response = $this->get(route('marketplace.producers.index'));

        $response->assertInertia(fn ($page) => $page->has('producers', 1)
            ->where('producers.0.name', 'Aktivno'));
    }

    public function test_list_can_be_filtered_by_city()
    {
        Producer::factory()->active()->create(['name' => 'Leskovacko', 'city' => 'Leskovac']);
        Producer::factory()->active()->create(['name' => 'Vranjsko', 'city' => 'Vranje']);

        $response = $this->get(route('marketplace.producers.index', ['city' => 'Vranje']));

        $response->assertInertia(fn ($page) => $page->has('producers', 1)
            ->where('producers.0.name', 'Vranjsko'));
    }
}
