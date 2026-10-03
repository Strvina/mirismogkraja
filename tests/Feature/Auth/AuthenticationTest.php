<?php

namespace Tests\Feature\Auth;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered()
    {
        $response = $this->get('/login');

        $response->assertStatus(200);
    }

    public function test_users_can_authenticate_using_the_login_screen()
    {
        $user = User::factory()->create();

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('home', absolute: false));
    }

    /**
     * An admin's login and logout reload the whole page, so the route list
     * written into it matches who is now signed in - an admin's includes
     * the admin panel's routes, a visitor's does not.
     */
    public function test_an_admin_logging_in_and_out_reloads_the_whole_page()
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create()->assignRole('admin');
        $inertia = ['X-Inertia' => 'true', 'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request())];

        $this->withHeaders($inertia)
            ->post('/login', ['email' => $admin->email, 'password' => 'password'])
            ->assertStatus(409)
            ->assertHeader('X-Inertia-Location', route('admin.dashboard'));

        $this->withHeaders($inertia)
            ->post('/logout')
            ->assertStatus(409)
            ->assertHeader('X-Inertia-Location', url('/'));
    }

    /** Everyone else keeps the same route list, so a normal, quick visit is enough. */
    public function test_anyone_else_logs_in_and_out_without_a_page_reload()
    {
        $user = User::factory()->create();
        $inertia = ['X-Inertia' => 'true', 'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request())];

        $this->withHeaders($inertia)
            ->post('/login', ['email' => $user->email, 'password' => 'password'])
            ->assertRedirect(route('home'));
        $this->assertAuthenticated();

        $this->withHeaders($inertia)->post('/logout')->assertRedirect('/');
        $this->assertGuest();
    }

    public function test_users_can_not_authenticate_with_invalid_password()
    {
        $user = User::factory()->create();

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    public function test_users_can_logout()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout');

        $this->assertGuest();
        $response->assertRedirect('/');
    }
}
