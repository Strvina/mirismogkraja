<?php

namespace Tests\Feature\Settings;

use App\Models\Producer;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/settings/profile');

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/settings/profile', [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/settings/profile');

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_profile_contact_fields_can_be_updated()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/settings/profile', [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => '+381601234567',
                'address' => 'Bulevar oslobođenja 1',
                'city' => 'Leskovac',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/settings/profile');

        $user->refresh();

        $this->assertSame('+381601234567', $user->phone);
        $this->assertSame('Bulevar oslobođenja 1', $user->address);
        $this->assertSame('Leskovac', $user->city);
    }

    public function test_avatar_can_be_uploaded_and_replaces_the_previous_one()
    {
        Storage::fake('public');

        $user = User::factory()->create(['avatar_path' => 'avatars/old.jpg']);
        Storage::disk('public')->put('avatars/old.jpg', 'fake-content');

        $response = $this
            ->actingAs($user)
            ->post('/settings/profile/avatar', [
                'avatar' => UploadedFile::fake()->create('avatar.jpg', 10, 'image/jpeg'),
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/settings/profile');

        $user->refresh();

        $this->assertNotSame('avatars/old.jpg', $user->avatar_path);
        Storage::disk('public')->assertExists($user->avatar_path);
        Storage::disk('public')->assertMissing('avatars/old.jpg');
    }

    public function test_avatar_can_be_uploaded_alone_without_touching_name_or_email()
    {
        Storage::fake('public');

        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->post('/settings/profile/avatar', [
                'avatar' => UploadedFile::fake()->create('avatar.jpg', 10, 'image/jpeg'),
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/settings/profile');

        Storage::disk('public')->assertExists($user->refresh()->avatar_path);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/settings/profile', [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/settings/profile');

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_user_can_delete_their_account()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->delete('/settings/profile', [
                'password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/');

        $this->assertGuest();
        $this->assertSoftDeleted('users', ['id' => $user->id]);
        $this->assertNull(User::find($user->id));
    }

    public function test_correct_password_must_be_provided_to_delete_account()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/settings/profile')
            ->delete('/settings/profile', [
                'password' => 'wrong-password',
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect('/settings/profile');

        $this->assertNotNull($user->fresh());
    }

    public function test_deleting_an_account_archives_its_producers_and_preserves_the_user_record(): void
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->for($user)->active()->create();

        $this->actingAs($user)->delete('/settings/profile', ['password' => 'password'])
            ->assertRedirect('/');

        $this->assertSoftDeleted('users', ['id' => $user->id]);
        $this->assertSoftDeleted('households', ['id' => $producer->id]);
        $this->assertNotNull(User::withTrashed()->find($user->id));
    }

    public function test_deleting_an_account_releases_its_email_address(): void
    {
        $user = User::factory()->create(['email' => 'povratnik@example.com']);

        $this->actingAs($user)->delete('/settings/profile', ['password' => 'password']);

        $this->assertDatabaseMissing('users', ['email' => 'povratnik@example.com']);

        // The address has to be free again, or the person could never come
        // back with the same e-mail.
        User::factory()->create(['email' => 'povratnik@example.com']);
        $this->assertSame(1, User::where('email', 'povratnik@example.com')->count());
    }

    public function test_the_last_administrator_cannot_delete_their_account(): void
    {
        $this->seed(RolesSeeder::class);

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->from('/settings/profile')
            ->delete('/settings/profile', ['password' => 'password'])
            ->assertSessionHasErrors('password');

        $this->assertNotNull($admin->fresh());
    }

    /**
     * The avatar endpoint has to stay a POST. PHP parses a multipart body
     * only for POST, so a PATCH upload reaches the application with no file
     * at all - which is why this worked in tests but not in a browser: the
     * test client hands the file to the request directly and never goes
     * through PHP's parser.
     */
    public function test_the_avatar_endpoint_does_not_accept_patch()
    {
        $this->actingAs(User::factory()->create())
            ->patch('/settings/profile/avatar', [])
            ->assertMethodNotAllowed();
    }
}
