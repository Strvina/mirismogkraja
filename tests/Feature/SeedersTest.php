<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Producer;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Database\Seeders\DemoContentSeeder;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/** What `db:seed` does where, and how a live site gets its administrator. */
class SeedersTest extends TestCase
{
    use RefreshDatabase;

    private function inProduction(): void
    {
        $this->app['env'] = 'production';
    }

    public function test_production_gets_the_reference_data_and_no_accounts_at_all(): void
    {
        $this->inProduction();

        // As on the server: production asks for --force.
        $this->artisan('db:seed', ['--force' => true])->assertSuccessful();
        $this->artisan('db:seed', ['--force' => true])->assertSuccessful(); // A later deploy: nothing doubles.

        $this->assertSame(['admin', 'buyer', 'seller'], Role::orderBy('name')->pluck('name')->all());
        $this->assertSame(12, Category::roots()->count());
        $this->assertSame(3, SubscriptionPlan::count());
        $this->assertSame(0, User::count());
        $this->assertSame(0, Producer::count());
    }

    public function test_the_demo_seeder_refuses_to_run_in_production_even_when_called_directly(): void
    {
        $this->seed(RolesSeeder::class);
        $this->inProduction();

        $this->artisan('db:seed', ['--class' => DemoContentSeeder::class, '--force' => true]);

        $this->assertFalse(User::where('email', 'admin@gmail.com')->exists());
        $this->assertSame(0, Producer::count());
    }

    public function test_a_local_setup_gets_the_demo_content_and_accounts(): void
    {
        // The demo certificates' placeholder documents, kept off the real disk.
        Storage::fake('local');

        $this->seed();

        $this->assertTrue(User::where('email', 'admin@gmail.com')->sole()->hasRole('admin'));
        $this->assertTrue(User::where('email', 'test@example.com')->exists());
        $this->assertGreaterThan(0, Producer::count());
    }

    public function test_admin_create_makes_a_verified_administrator(): void
    {
        $this->artisan('admin:create', ['email' => 'Vlasnik@Example.com'])
            ->expectsQuestion('Name', 'Vlasnik Sajta')
            ->expectsQuestion('Password (at least 12 characters)', 'dugacka-lozinka-123')
            ->assertSuccessful();

        $admin = User::where('email', 'vlasnik@example.com')->sole();
        $this->assertTrue($admin->hasRole('admin'));
        $this->assertNotNull($admin->email_verified_at);
        $this->assertTrue(password_verify('dugacka-lozinka-123', $admin->password));
    }

    public function test_admin_create_can_promote_an_existing_account_and_rejects_nonsense(): void
    {
        $user = User::factory()->create(['email' => 'postoji@example.com']);

        $this->artisan('admin:create', ['email' => 'postoji@example.com'])
            ->expectsConfirmation('postoji@example.com already has an account. Make it an administrator?', 'yes')
            ->assertSuccessful();
        $this->assertTrue($user->fresh()->hasRole('admin'));

        $this->artisan('admin:create', ['email' => 'nije-adresa'])->assertFailed();
    }
}
