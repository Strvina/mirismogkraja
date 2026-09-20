<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\User;
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

    public function test_the_page_carries_the_gallery_story_and_contact()
    {
        $producer = Producer::factory()->active()->create([
            'story' => 'Sve počinje u sezoni.',
            'phone' => '+381 60 123 4567',
            'contact_email' => 'kontakt@example.com',
        ]);
        $producer->images()->create(['path' => 'producers/gallery/a.jpg', 'caption' => 'Dvorište', 'order' => 0]);

        $this->get(route('marketplace.producers.show', $producer->slug))->assertInertia(
            fn ($page) => $page->has('gallery', 1)
                ->where('gallery.0.caption', 'Dvorište')
                ->where('producer.story', 'Sve počinje u sezoni.')
                ->where('producer.phone', '+381 60 123 4567')
                ->where('producer.contact_email', 'kontakt@example.com')
        );
    }

    public function test_the_owner_is_not_offered_to_message_themselves()
    {
        $owner = User::factory()->create();
        $producer = Producer::factory()->for($owner)->active()->create();

        $this->actingAs($owner)->get(route('marketplace.producers.show', $producer->slug))
            ->assertInertia(fn ($page) => $page->where('canMessage', false));

        $this->actingAs(User::factory()->create())->get(route('marketplace.producers.show', $producer->slug))
            ->assertInertia(fn ($page) => $page->where('canMessage', true));
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
