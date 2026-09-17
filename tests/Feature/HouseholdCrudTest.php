<?php

namespace Tests\Feature;

use App\Models\Household;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class HouseholdCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_login()
    {
        $household = Household::factory()->create();

        $this->get(route('households.index'))->assertRedirect('/login');
        $this->get(route('households.create'))->assertRedirect('/login');
        $this->get(route('households.edit', $household))->assertRedirect('/login');
    }

    public function test_authenticated_user_can_create_a_household()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('households.store'), [
            'name' => 'Domaćinstvo Nićić',
            'description' => 'Ajvar i zimnica.',
            'address' => 'Bulevar oslobođenja 1',
            'city' => 'Leskovac',
        ]);

        $response->assertRedirect(route('households.index'));

        $household = Household::sole();
        $this->assertSame($user->id, $household->user_id);
        $this->assertSame('domacinstvo-nicic', $household->slug);
        $this->assertSame('pending', $household->status);
    }

    public function test_creating_two_households_with_the_same_name_gets_unique_slugs()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('households.store'), ['name' => 'Zapis']);
        $this->actingAs($user)->post(route('households.store'), ['name' => 'Zapis']);

        $this->assertSame(['zapis', 'zapis-1'], Household::orderBy('id')->pluck('slug')->toArray());
    }

    public function test_index_only_lists_the_authenticated_users_own_households()
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        Household::factory()->for($user)->create(['name' => 'Moje']);
        Household::factory()->for($other)->create(['name' => 'Tuđe']);

        $response = $this->actingAs($user)->get(route('households.index'));

        $response->assertInertia(fn ($page) => $page->has('households', 1)
            ->where('households.0.name', 'Moje'));
    }

    public function test_user_cannot_edit_another_users_household()
    {
        $user = User::factory()->create();
        $household = Household::factory()->for(User::factory())->create();

        $this->actingAs($user)->get(route('households.edit', $household))->assertForbidden();
        $this->actingAs($user)->put(route('households.update', $household), ['name' => 'Hack'])->assertForbidden();
        $this->actingAs($user)->delete(route('households.destroy', $household))->assertForbidden();
    }

    public function test_owner_can_update_their_household()
    {
        $user = User::factory()->create();
        $household = Household::factory()->for($user)->create(['name' => 'Staro ime']);

        $this->actingAs($user)->put(route('households.update', $household), [
            'name' => 'Novo ime',
            'city' => 'Vranje',
        ])->assertRedirect(route('households.index'));

        $household->refresh();
        $this->assertSame('Novo ime', $household->name);
        $this->assertSame('novo-ime', $household->slug);
        $this->assertSame('Vranje', $household->city);
    }

    public function test_cover_image_and_logo_can_be_uploaded_on_create()
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('households.store'), [
            'name' => 'Domaćinstvo Nićić',
            'cover_image' => UploadedFile::fake()->create('cover.jpg', 10, 'image/jpeg'),
            'logo' => UploadedFile::fake()->create('logo.jpg', 10, 'image/jpeg'),
        ]);

        $household = Household::sole();
        Storage::disk('public')->assertExists($household->cover_image_path);
        Storage::disk('public')->assertExists($household->logo_path);
    }

    public function test_uploading_a_new_cover_image_removes_the_old_one()
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $household = Household::factory()->for($user)->create(['cover_image_path' => 'households/covers/old.jpg']);
        Storage::disk('public')->put('households/covers/old.jpg', 'fake');

        $this->actingAs($user)->put(route('households.update', $household), [
            'name' => $household->name,
            'cover_image' => UploadedFile::fake()->create('new.jpg', 10, 'image/jpeg'),
        ]);

        $household->refresh();
        $this->assertNotSame('households/covers/old.jpg', $household->cover_image_path);
        Storage::disk('public')->assertExists($household->cover_image_path);
        Storage::disk('public')->assertMissing('households/covers/old.jpg');
    }

    public function test_owner_can_delete_their_household()
    {
        $user = User::factory()->create();
        $household = Household::factory()->for($user)->create();

        $this->actingAs($user)->delete(route('households.destroy', $household))
            ->assertRedirect(route('households.index'));

        $this->assertDatabaseMissing('households', ['id' => $household->id]);
    }
}
