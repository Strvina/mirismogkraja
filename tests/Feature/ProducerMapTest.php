<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Inertia;
use Tests\TestCase;

/** The producer map (task 21): a point the producer marks, shown to buyers. */
class ProducerMapTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_producer_marks_a_point_and_it_is_on_their_page(): void
    {
        $producer = Producer::factory()->active()->create();

        $this->actingAs($producer->user)->put(route('producers.update', $producer), [
            'name' => $producer->name,
            'lat' => '43.32472',
            'lng' => '21.90333',
        ])->assertSessionHasNoErrors();

        $this->assertEqualsWithDelta(43.32472, (float) $producer->refresh()->lat, 0.00001);

        $this->get(route('marketplace.producers.show', $producer->slug))
            ->assertInertia(fn ($page) => $page->where('producer.lat', '43.3247200')->where('producer.lng', '21.9033300'));
    }

    /** A point is both coordinates or neither, and on the planet. */
    public function test_half_a_point_or_one_off_the_map_is_refused(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('producers.store'), ['name' => 'Pola tačke', 'lat' => '43.3'])
            ->assertSessionHasErrors('lng');
        $this->actingAs($user)->post(route('producers.store'), ['name' => 'Van mape', 'lat' => '120', 'lng' => '21.9'])
            ->assertSessionHasErrors('lat');

        $this->assertSame(0, Producer::count());
    }

    public function test_the_directory_map_is_only_built_when_opened(): void
    {
        Producer::factory()->active()->create(['name' => 'Na mapi', 'city' => 'Niš', 'lat' => 43.32, 'lng' => 21.9]);
        Producer::factory()->active()->create(['name' => 'Bez tačke']);
        Producer::factory()->create(['status' => 'pending', 'lat' => 43.1, 'lng' => 22.0]);
        Producer::factory()->active()->create(['city' => 'Pirot', 'lat' => 43.15, 'lng' => 22.58]);

        $this->get(route('marketplace.producers.index'))->assertInertia(fn ($page) => $page->missing('mapPoints'));

        $this->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => Inertia::getVersion(),
            'X-Inertia-Partial-Component' => 'marketplace/producers/index',
            'X-Inertia-Partial-Data' => 'mapPoints',
        ])->get(route('marketplace.producers.index', ['city' => 'Niš']))
            ->assertJsonCount(1, 'props.mapPoints')
            ->assertJsonPath('props.mapPoints.0.name', 'Na mapi')
            ->assertJsonPath('props.mapPoints.0.lat', 43.32);
    }
}
