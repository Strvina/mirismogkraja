<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/** The robot check on the two public forms a script would hammer. */
class TurnstileTest extends TestCase
{
    use RefreshDatabase;

    private const VERIFY = 'challenges.cloudflare.com/*';

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.turnstile.site_key' => 'site-key', 'services.turnstile.secret_key' => 'secret-key']);
        $this->seed(RolesSeeder::class);
    }

    private function register(array $extra = [])
    {
        return $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            ...$extra,
        ]);
    }

    public function test_the_pages_get_the_site_key_only_when_the_check_is_on(): void
    {
        $this->get('/register')->assertInertia(fn ($page) => $page->where('captchaSiteKey', 'site-key'));
        $this->get('/forgot-password')->assertInertia(fn ($page) => $page->where('captchaSiteKey', 'site-key'));

        config(['services.turnstile.secret_key' => null]);
        $this->get('/register')->assertInertia(fn ($page) => $page->where('captchaSiteKey', null));
    }

    public function test_a_passed_check_registers_and_sends_the_token_to_cloudflare(): void
    {
        Http::fake([self::VERIFY => Http::response(['success' => true])]);

        $this->register(['captcha' => 'token-1'])->assertSessionHasNoErrors();

        $this->assertAuthenticated();
        Http::assertSent(fn (Request $request) => $request['secret'] === 'secret-key' && $request['response'] === 'token-1');
    }

    public function test_a_missing_or_failed_check_stops_the_form(): void
    {
        Http::fake([self::VERIFY => Http::response(['success' => false, 'error-codes' => ['invalid-input-response']])]);

        $this->register()->assertSessionHasErrors('captcha');
        Http::assertNothingSent();

        $this->register(['captcha' => 'forged'])->assertSessionHasErrors('captcha');

        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => 'test@example.com']);
    }

    public function test_the_password_reset_form_is_checked_too(): void
    {
        Notification::fake();
        Http::fake([self::VERIFY => Http::response(['success' => false])]);
        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email, 'captcha' => 'forged'])->assertSessionHasErrors('captcha');

        Notification::assertNothingSent();
    }

    /** A Cloudflare outage must not lock real people out; the throttles still hold. */
    public function test_cloudflare_being_unreachable_lets_the_form_through(): void
    {
        Http::fake(fn () => throw new ConnectionException('timed out'));

        $this->register(['captcha' => 'token-1'])->assertSessionHasNoErrors();

        $this->assertAuthenticated();
    }

    public function test_without_keys_there_is_no_check(): void
    {
        config(['services.turnstile.site_key' => null, 'services.turnstile.secret_key' => null]);
        Http::fake();

        $this->register()->assertSessionHasNoErrors();

        $this->assertAuthenticated();
        Http::assertNothingSent();
    }
}
