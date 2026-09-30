<?php

namespace Tests\Feature\Auth;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\User;
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
     * Logging in and out from the Inertia page is a full page load, so the
     * route list written into the page matches who is now signed in - an
     * admin's includes the admin panel's routes, a visitor's does not.
     */
    public function test_logging_in_and_out_reloads_the_whole_page()
    {
        $user = User::factory()->create();
        $inertia = ['X-Inertia' => 'true', 'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request())];

        $this->withHeaders($inertia)
            ->post('/login', ['email' => $user->email, 'password' => 'password'])
            ->assertStatus(409)
            ->assertHeader('X-Inertia-Location', route('home'));

        $this->withHeaders($inertia)
            ->post('/logout')
            ->assertStatus(409)
            ->assertHeader('X-Inertia-Location', url('/'));
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
