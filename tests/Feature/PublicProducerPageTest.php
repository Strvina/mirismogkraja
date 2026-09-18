<?php

namespace Tests\Feature;

use App\Models\Producer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicProducerPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_producer_page_is_publicly_visible()
    {
        $producer = Producer::factory()->active()->create(['name' => 'Domaćinstvo Nićić']);

        $this->get(route('marketplace.producers.show', $producer))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('marketplace/producers/show')
                ->where('producer.name', 'Domaćinstvo Nićić'));
    }

    public function test_pending_producer_page_returns_404()
    {
        $producer = Producer::factory()->create(['status' => 'pending']);

        $this->get(route('marketplace.producers.show', $producer))->assertNotFound();
    }

    public function test_blocked_producer_page_returns_404()
    {
        $producer = Producer::factory()->create(['status' => 'blocked']);

        $this->get(route('marketplace.producers.show', $producer))->assertNotFound();
    }
}
