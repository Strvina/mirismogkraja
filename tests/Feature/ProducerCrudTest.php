<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProducerCrudTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesSeeder::class);
    }

    public function test_guests_are_redirected_to_login()
    {
        $producer = Producer::factory()->create();

        $this->get(route('producers.index'))->assertRedirect('/login');
        $this->get(route('producers.create'))->assertRedirect('/login');
        $this->get(route('producers.edit', $producer))->assertRedirect('/login');
    }

    public function test_authenticated_user_can_create_a_producer()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('producers.store'), [
            'name' => 'Domaćinstvo Nićić',
            'description' => 'Ajvar i zimnica.',
            'address' => 'Bulevar oslobođenja 1',
            'city' => 'Leskovac',
        ]);

        $response->assertRedirect(route('producers.index'));

        $producer = Producer::sole();
        $this->assertSame($user->id, $producer->user_id);
        $this->assertSame('domacinstvo-nicic', $producer->slug);
        $this->assertSame('pending', $producer->status);
    }

    public function test_creating_two_producers_with_the_same_name_gets_unique_slugs()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('producers.store'), ['name' => 'Zapis']);
        $this->actingAs($user)->post(route('producers.store'), ['name' => 'Zapis']);

        $this->assertSame(['zapis', 'zapis-1'], Producer::orderBy('id')->pluck('slug')->toArray());
    }

    public function test_index_only_lists_the_authenticated_users_own_producers()
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        Producer::factory()->for($user)->create(['name' => 'Moje']);
        Producer::factory()->for($other)->create(['name' => 'Tuđe']);

        $response = $this->actingAs($user)->get(route('producers.index'));

        $response->assertInertia(fn ($page) => $page->has('producers', 1)
            ->where('producers.0.name', 'Moje'));
    }

    public function test_user_cannot_edit_another_users_producer()
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->for(User::factory())->create();

        $this->actingAs($user)->get(route('producers.edit', $producer))->assertForbidden();
        $this->actingAs($user)->put(route('producers.update', $producer), ['name' => 'Hack'])->assertForbidden();
        $this->actingAs($user)->delete(route('producers.destroy', $producer))->assertForbidden();
    }

    public function test_owner_can_update_their_producer()
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->for($user)->create(['name' => 'Staro ime']);

        $this->actingAs($user)->put(route('producers.update', $producer), [
            'name' => 'Novo ime',
            'city' => 'Vranje',
        ])->assertRedirect(route('producers.index'));

        $producer->refresh();
        $this->assertSame('Novo ime', $producer->name);
        $this->assertSame('novo-ime', $producer->slug);
        $this->assertSame('Vranje', $producer->city);
    }

    public function test_delivery_methods_can_be_saved_including_a_custom_one()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('producers.store'), [
            'name' => 'Salaš Kraljević',
            'delivery_methods' => ['licna_dostava', 'Dostava autobusom'],
        ])->assertRedirect(route('producers.index'));

        $this->assertSame(['licna_dostava', 'Dostava autobusom'], $user->producers()->sole()->delivery_methods);
    }

    public function test_clearing_every_delivery_method_removes_them()
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->for($user)->create([
            'name' => 'Ime',
            'delivery_methods' => ['licna_dostava'],
        ]);

        $this->actingAs($user)->put(route('producers.update', $producer), ['name' => 'Ime'])
            ->assertRedirect(route('producers.index'));

        $this->assertSame([], $producer->refresh()->delivery_methods);
    }

    public function test_cover_image_and_logo_can_be_uploaded_on_create()
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('producers.store'), [
            'name' => 'Domaćinstvo Nićić',
            'cover_image' => UploadedFile::fake()->create('cover.jpg', 10, 'image/jpeg'),
            'logo' => UploadedFile::fake()->create('logo.jpg', 10, 'image/jpeg'),
        ]);

        $producer = Producer::sole();
        Storage::disk('public')->assertExists($producer->cover_image_path);
        Storage::disk('public')->assertExists($producer->logo_path);
    }

    public function test_uploading_a_new_cover_image_removes_the_old_one()
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $producer = Producer::factory()->for($user)->create(['cover_image_path' => 'producers/covers/old.jpg']);
        Storage::disk('public')->put('producers/covers/old.jpg', 'fake');

        $this->actingAs($user)->put(route('producers.update', $producer), [
            'name' => $producer->name,
            'cover_image' => UploadedFile::fake()->create('new.jpg', 10, 'image/jpeg'),
        ]);

        $producer->refresh();
        $this->assertNotSame('producers/covers/old.jpg', $producer->cover_image_path);
        Storage::disk('public')->assertExists($producer->cover_image_path);
        Storage::disk('public')->assertMissing('producers/covers/old.jpg');
    }

    public function test_owner_can_archive_their_producer_without_losing_historical_data()
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->for($user)->create();

        $this->actingAs($user)->delete(route('producers.destroy', $producer))
            ->assertRedirect(route('producers.index'));

        $this->assertSoftDeleted('households', ['id' => $producer->id]);
        $this->assertNotNull(Producer::withTrashed()->find($producer->id));
    }
}
