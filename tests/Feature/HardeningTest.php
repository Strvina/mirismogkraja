<?php

namespace Tests\Feature;

use App\Models\User;
use App\Providers\AppServiceProvider;
use Database\Seeders\RolesSeeder;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Tests\TestCase;

/**
 * The settings that make a mistake or an attack cost less: what a password
 * has to be, what the live database refuses, whose word is taken for a
 * visitor's address, and what a form can never set.
 */
class HardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        // Static switches, so a test that plays the live site puts them back.
        DB::prohibitDestructiveCommands(false);
        Model::preventLazyLoading();
        Model::preventSilentlyDiscardingAttributes();

        parent::tearDown();
    }

    /** As the provider sets things up on the live site. */
    private function bootAsLiveSite(): void
    {
        $this->app['env'] = 'production';
        (new AppServiceProvider($this->app))->boot();
    }

    /** @return array<int, string> */
    private function passwordErrors(string $password): array
    {
        return Validator::make(['password' => $password], ['password' => Password::defaults()])->errors()->get('password');
    }

    public function test_on_the_live_site_a_password_needs_a_letter_a_number_and_not_to_have_leaked(): void
    {
        // The leak list answers with the endings of matching hashes; this is "lozinka123".
        $leaked = strtoupper(sha1('lozinka123'));
        Http::fake(['api.pwnedpasswords.com/range/'.substr($leaked, 0, 5) => Http::response(substr($leaked, 5).':42'), '*' => Http::response('')]);

        // While developing, eight characters are enough - and nothing is asked of the internet.
        $this->assertSame([], $this->passwordErrors('lozinkaa'));
        Http::assertNothingSent();

        $this->bootAsLiveSite();

        $this->assertNotEmpty($this->passwordErrors('samoslova'));
        $this->assertNotEmpty($this->passwordErrors('12345678'));
        $this->assertNotEmpty($this->passwordErrors('lozinka123'));
        $this->assertSame([], $this->passwordErrors('zimnica-sa-juga-7'));
    }

    public function test_a_leak_list_that_does_not_answer_does_not_stop_a_sign_up(): void
    {
        Http::fake(fn () => throw new \RuntimeException('no route to host'));

        $this->bootAsLiveSite();

        $this->assertSame([], $this->passwordErrors('zimnica-sa-juga-7'));
    }

    public function test_the_live_database_refuses_to_be_wiped(): void
    {
        $this->bootAsLiveSite();

        // Even with --force, which is what turns off the "are you sure?".
        $this->artisan('migrate:fresh', ['--force' => true])->assertFailed();
        $this->artisan('db:wipe', ['--force' => true])->assertFailed();

        $this->assertTrue(DB::getSchemaBuilder()->hasTable('users'));
    }

    public function test_while_developing_a_dropped_attribute_is_an_error_and_on_the_live_site_it_is_not(): void
    {
        $user = User::factory()->create();

        try {
            $user->update(['blocked_at' => now()]);
            $this->fail('An attribute that is not fillable was dropped in silence.');
        } catch (MassAssignmentException) {
            $this->assertNull($user->refresh()->blocked_at);
        }

        $this->bootAsLiveSite();

        // No exception on the live site, and still not a way to block an account.
        $user->update(['blocked_at' => now()]);
        $this->assertNull($user->refresh()->blocked_at);
    }

    public function test_an_account_is_blocked_by_an_administrator_and_by_nothing_a_form_sends(): void
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $user = User::factory()->create();

        // The owner's own profile form cannot carry it...
        $this->actingAs($user)->patch(route('profile.update'), ['name' => $user->name, 'email' => $user->email, 'blocked_at' => now()->toDateTimeString()]);
        $this->assertNull($user->refresh()->blocked_at);

        // ...the administrator's button can.
        $this->actingAs($admin)->patch(route('admin.users.block', $user))->assertRedirect();
        $this->assertNotNull($user->refresh()->blocked_at);
    }

    public function test_a_visitors_address_is_taken_from_a_proxy_only_when_the_proxy_is_trusted(): void
    {
        Route::get('/_whoami', fn () => request()->ip().'|'.(request()->isSecure() ? 'https' : 'http'));
        $forwarded = ['X-Forwarded-For' => '203.0.113.9', 'X-Forwarded-Proto' => 'https'];

        // The server faces the internet itself: the header is anyone's to send, and is ignored.
        $this->get('/_whoami', $forwarded)->assertSee('127.0.0.1|http');

        config(['trustedproxy.proxies' => '*']);

        $this->get('/_whoami', $forwarded)->assertSee('203.0.113.9|https');
    }

    public function test_every_write_a_signed_in_user_can_repeat_at_will_has_a_limit(): void
    {
        $unlimited = collect(Route::getRoutes())
            ->filter(fn ($route) => in_array($route->getName(), [
                'favorites.toggle', 'producers.follow', 'profile.update', 'profile.avatar.update',
                'producers.update', 'messages.block', 'messages.outcome', 'notifications.read-all',
            ], true))
            ->reject(fn ($route) => collect($route->gatherMiddleware())->contains(fn ($middleware) => str_starts_with((string) $middleware, 'throttle:')))
            ->map->getName()
            ->values()
            ->all();

        $this->assertSame([], $unlimited);
    }
}
