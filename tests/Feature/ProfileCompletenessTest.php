<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileCompletenessTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_bare_profile_lists_what_is_missing_with_where_to_add_it(): void
    {
        $producer = Producer::factory()->active()->create([
            'logo_path' => null, 'cover_image_path' => null, 'description' => 'Kratko.', 'story' => null,
            'city' => 'Niš', 'lat' => null, 'lng' => null, 'phone' => '0601234567', 'delivery_methods' => [],
        ]);

        $this->actingAs($producer->user)->get(route('producers.index'))->assertInertia(fn ($page) => $page
            ->where('producers.0.completeness.percent', 11)
            ->where('producers.0.completeness.missing.0.key', 'logo')
            ->where('producers.0.completeness.missing.0.href', route('producers.edit', $producer))
            ->where('producers.0.completeness.missing.7.key', 'products')
            ->where('producers.0.completeness.missing.7.href', route('producers.products.create', $producer)));
    }

    public function test_a_finished_profile_is_complete(): void
    {
        $producer = Producer::factory()->active()->create([
            'logo_path' => 'producers/logos/a.jpg', 'cover_image_path' => 'producers/covers/a.jpg',
            'description' => str_repeat('Domaći med sa Suve planine. ', 4), 'story' => 'Pčelarimo od 1987.',
            'city' => 'Niš', 'lat' => 43.32, 'lng' => 21.89, 'contact_email' => 'med@example.com', 'delivery_methods' => ['preuzimanje'],
        ]);
        Product::factory()->count(3)->for($producer)->sequence(fn ($s) => ['slug' => "med-{$s->index}"])->create(['status' => 'active']);
        foreach (range(1, 3) as $i) {
            $producer->images()->create(['path' => "producers/gallery/{$i}.jpg", 'order' => $i]);
        }

        $this->actingAs($producer->user)->get(route('producers.index'))->assertInertia(fn ($page) => $page
            ->where('producers.0.completeness.percent', 100)
            ->has('producers.0.completeness.missing', 0));
    }
}
