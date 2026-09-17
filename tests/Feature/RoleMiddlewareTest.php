<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class RoleMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesSeeder::class);

        // Real seller/admin-only pages don't exist yet (Faze 2 and 6), so this
        // registers a throwaway route just to exercise the 'role' middleware
        // alias registered in bootstrap/app.php.
        Route::middleware(['web', 'auth', 'role:seller'])
            ->get('/_test/seller-only', fn () => 'ok');
    }

    public function test_guests_are_redirected_from_a_role_protected_route()
    {
        $this->get('/_test/seller-only')->assertRedirect('/login');
    }

    public function test_user_without_the_role_is_forbidden()
    {
        $user = User::factory()->create();
        $user->assignRole('buyer');

        $this->actingAs($user)
            ->get('/_test/seller-only')
            ->assertForbidden();
    }

    public function test_user_with_the_role_is_allowed()
    {
        $user = User::factory()->create();
        $user->assignRole('seller');

        $this->actingAs($user)
            ->get('/_test/seller-only')
            ->assertOk()
            ->assertSee('ok');
    }
}
