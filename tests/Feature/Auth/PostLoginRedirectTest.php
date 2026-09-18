<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PostLoginRedirectTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesSeeder::class);
    }

    public function test_a_buyer_lands_on_the_home_page_after_logging_in(): void
    {
        $user = User::factory()->create();
        $user->assignRole('buyer');

        $this->post('/login', ['email' => $user->email, 'password' => 'password'])
            ->assertRedirect(route('home', absolute: false));
    }

    public function test_an_admin_lands_on_the_admin_panel_after_logging_in(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->post('/login', ['email' => $admin->email, 'password' => 'password'])
            ->assertRedirect(route('admin.dashboard', absolute: false));
    }

    public function test_a_new_registration_lands_on_the_home_page(): void
    {
        $this->post('/register', [
            'name' => 'Marko Marković',
            'email' => 'marko@example.com',
            'password' => 'lozinka-123',
            'password_confirmation' => 'lozinka-123',
        ])->assertRedirect(route('home', absolute: false));

        $this->assertAuthenticated();
    }
}
