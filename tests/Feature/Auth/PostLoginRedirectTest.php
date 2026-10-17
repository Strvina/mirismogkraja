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

    public function test_signing_in_from_a_page_comes_back_to_it(): void
    {
        $user = User::factory()->create();
        $user->assignRole('buyer');

        $this->get('/login?redirect='.urlencode('/proizvod/domaci-ajvar?boja=crvena'))->assertOk();

        $this->post('/login', ['email' => $user->email, 'password' => 'password'])
            ->assertRedirect('/proizvod/domaci-ajvar?boja=crvena');
    }

    public function test_the_way_back_never_leads_off_the_site(): void
    {
        $user = User::factory()->create();
        $user->assignRole('buyer');

        foreach (['//evil.example', 'https://evil.example/x', '/\\evil.example', 'proizvodi'] as $destination) {
            $this->get('/login?redirect='.urlencode($destination))->assertOk();
            $this->post('/login', ['email' => $user->email, 'password' => 'password'])
                ->assertRedirect(route('home', absolute: false));
            $this->post('/logout');
        }
    }

    public function test_signing_in_from_the_home_page_forgets_an_abandoned_way_back(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->get('/login?redirect=/proizvodi');
        // Encoded, as the page's link has it: a bare trailing "/" is trimmed by the test client.
        $this->get('/login?redirect=%2F');

        $this->post('/login', ['email' => $admin->email, 'password' => 'password'])
            ->assertRedirect(route('admin.dashboard', absolute: false));
    }

    public function test_a_new_account_keeps_the_way_back_through_the_address_confirmation(): void
    {
        $this->get('/register?redirect=/proizvodjaci/nov')->assertOk();

        $this->post('/register', [
            'name' => 'Marko Marković',
            'email' => 'marko@example.com',
            'password' => 'lozinka-123',
            'password_confirmation' => 'lozinka-123',
        ])->assertRedirect(route('verification.notice', absolute: false));

        $this->assertSame(url('/proizvodjaci/nov'), session('url.intended'));
    }

    public function test_a_new_registration_is_asked_to_confirm_the_email_first(): void
    {
        $this->post('/register', [
            'name' => 'Marko Marković',
            'email' => 'marko@example.com',
            'password' => 'lozinka-123',
            'password_confirmation' => 'lozinka-123',
        ])->assertRedirect(route('verification.notice', absolute: false));

        $this->assertAuthenticated();
    }
}
