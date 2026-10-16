<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use App\Support\Districts;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DistrictTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_town_is_found_however_it_is_spelled()
    {
        $this->assertSame('nisavski', Districts::forCity('Niš'));
        $this->assertSame('nisavski', Districts::forCity(' nis '));
        $this->assertSame('zlatiborski', Districts::forCity('Zlatibor'));
        $this->assertSame('beograd', Districts::forCity('Novi Beograd'));
        $this->assertNull(Districts::forCity('Gornje Selo'));
        $this->assertNull(Districts::forCity(null));
    }

    public function test_the_district_follows_the_town_unless_one_is_picked()
    {
        $producer = Producer::factory()->create(['city' => 'Leskovac']);
        $this->assertSame('jablanicki', $producer->district);

        // A new town, a new district.
        $producer->update(['city' => 'Vranje']);
        $this->assertSame('pcinjski', $producer->fresh()->district);

        // A village the list does not know keeps the district there was.
        $producer->update(['city' => 'Gornje Selo']);
        $this->assertSame('pcinjski', $producer->fresh()->district);

        // One picked by the producer stays, alongside a town.
        $producer->update(['city' => 'Donje Selo', 'district' => 'toplicki']);
        $this->assertSame('toplicki', $producer->fresh()->district);
    }

    public function test_the_producer_can_pick_a_district_but_only_a_real_one()
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->active()->for($user)->create(['city' => 'Niš']);
        $data = ['name' => $producer->name, 'city' => 'Mali Vrh', 'district' => 'pirotski'];

        $this->actingAs($user)->put(route('producers.update', $producer), $data)->assertSessionHasNoErrors();
        $this->assertSame('pirotski', $producer->fresh()->district);

        $this->actingAs($user)->put(route('producers.update', $producer), [...$data, 'district' => 'atlantida'])->assertSessionHasErrors('district');
    }

    public function test_the_catalogue_and_the_producer_list_narrow_by_district()
    {
        $nis = Producer::factory()->active()->create(['name' => 'Niški', 'city' => 'Niš']);
        $aleksinac = Producer::factory()->active()->create(['name' => 'Aleksinački', 'city' => 'Aleksinac']);
        $vranje = Producer::factory()->active()->create(['name' => 'Vranjski', 'city' => 'Vranje']);
        foreach ([$nis, $aleksinac, $vranje] as $producer) {
            Product::factory()->for($producer)->create(['status' => 'active', 'name' => 'Od '.$producer->name]);
        }

        $this->get(route('marketplace.products.index', ['district' => 'nisavski']))->assertInertia(fn ($page) => $page
            ->has('products.data', 2)
            ->where('filters.district', 'nisavski')
            // Only the districts something is sold from, each with its towns.
            ->where('districts', [
                ['value' => 'nisavski', 'label' => 'Nišavski okrug', 'cities' => ['Aleksinac', 'Niš']],
                ['value' => 'pcinjski', 'label' => 'Pčinjski okrug', 'cities' => ['Vranje']],
            ]));

        $this->get(route('marketplace.producers.index', ['district' => 'pcinjski']))->assertInertia(fn ($page) => $page
            ->has('producers.data', 1)
            ->where('producers.data.0.name', 'Vranjski')
            ->where('filters.district', 'pcinjski')
            ->has('districts', 2));
    }
}
