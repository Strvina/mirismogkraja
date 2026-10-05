<?php

namespace Tests\Feature\Auth;

use App\Http\Middleware\ThrottlePerRoute;
use App\Models\User;
use App\Services\TwoFactor;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

/**
 * Two-step sign-in: optional, set up in two steps, and from then on no
 * session exists until the code has been given.
 */
class TwoFactorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ThrottlePerRoute::class);
        $this->seed(RolesSeeder::class);
    }

    /** What the user's authenticator app shows right now. */
    private function codeFor(User $user): string
    {
        return app(Google2FA::class)->getCurrentOtp($user->fresh()->two_factor_secret);
    }

    /**
     * A user with two-step sign-in on, and their recovery codes.
     *
     * @return array{0: User, 1: list<string>}
     */
    private function userWithTwoFactor(array $attributes = []): array
    {
        $user = User::factory()->create($attributes);
        $twoFactor = app(TwoFactor::class);
        $twoFactor->begin($user);
        $user->forceFill(['two_factor_confirmed_at' => now()])->save();

        return [$user, $twoFactor->regenerateRecoveryCodes($user)];
    }

    private function signInWithPassword(User $user): void
    {
        $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertRedirect(route('two-factor.challenge'));
        $this->assertGuest();
    }

    public function test_it_is_set_up_in_two_steps_and_counts_only_after_the_second(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('two-factor.edit'))->assertInertia(fn ($page) => $page
            ->component('settings/two-factor')->where('enabled', false)->where('setup', null)->where('hasPassword', true));

        // The password is asked again before anything is started.
        $this->actingAs($user)->post(route('two-factor.store'), ['current_password' => 'wrong'])->assertSessionHasErrors('current_password');
        $this->actingAs($user)->get(route('two-factor.qr'))->assertNotFound();

        $this->actingAs($user)->post(route('two-factor.store'), ['current_password' => 'password'])->assertSessionHasNoErrors();
        $this->assertFalse($user->fresh()->hasTwoFactor());

        $this->actingAs($user)->get(route('two-factor.edit'))->assertInertia(fn ($page) => $page
            ->where('enabled', false)->where('setup.secret', $user->fresh()->two_factor_secret));
        $this->actingAs($user)->get(route('two-factor.qr'))->assertOk()
            ->assertHeader('Content-Type', 'image/svg+xml')
            ->assertHeader('Cache-Control', 'no-store, private');

        // Signing in still asks for nothing more: it is not confirmed yet.
        $this->actingAs($user)->post(route('two-factor.confirm'), ['code' => '000000'])->assertSessionHasErrors('code');
        $this->assertFalse($user->fresh()->hasTwoFactor());

        $this->actingAs($user)->post(route('two-factor.confirm'), ['code' => $this->codeFor($user)])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('two_factor.recovery_codes', fn (array $codes) => count($codes) === 8);

        $this->assertTrue($user->fresh()->hasTwoFactor());
        $this->actingAs($user)->get(route('two-factor.qr'))->assertNotFound();
    }

    public function test_the_secret_never_reaches_a_page(): void
    {
        [$user] = $this->userWithTwoFactor();

        $this->actingAs($user)->get(route('two-factor.edit'))->assertInertia(fn ($page) => $page
            ->where('enabled', true)
            ->where('setup', null)
            ->where('recoveryCodes', null)
            ->where('recoveryCodesLeft', 8)
            ->missing('auth.user.two_factor_secret')
            ->missing('auth.user.two_factor_recovery_codes'));

        // Encrypted where it is stored, too.
        $this->assertStringNotContainsString($user->two_factor_secret, (string) $user->getRawOriginal('two_factor_secret'));
    }

    public function test_a_password_alone_no_longer_signs_in(): void
    {
        [$user] = $this->userWithTwoFactor();

        $this->signInWithPassword($user);

        // Nothing behind the sign-in opens meanwhile.
        $this->get(route('profile.edit'))->assertRedirect(route('login'));
        $this->get(route('two-factor.challenge'))->assertOk()->assertInertia(fn ($page) => $page->component('auth/two-factor-challenge'));

        $this->post(route('two-factor.challenge'), ['code' => '000000'])->assertSessionHasErrors('code');
        $this->assertGuest();

        // And on to the page they were stopped at, as after any sign-in.
        $this->post(route('two-factor.challenge'), ['code' => $this->codeFor($user)])->assertRedirect(route('profile.edit'));
        $this->assertAuthenticatedAs($user);
    }

    public function test_a_code_works_once(): void
    {
        [$user] = $this->userWithTwoFactor();
        $code = $this->codeFor($user);

        $this->signInWithPassword($user);
        $this->post(route('two-factor.challenge'), ['code' => $code])->assertRedirect();
        $this->post('/logout');

        // Read over a shoulder and typed again inside the same half minute.
        $this->signInWithPassword($user);
        $this->post(route('two-factor.challenge'), ['code' => $code])->assertSessionHasErrors('code');
        $this->assertGuest();
    }

    public function test_a_recovery_code_signs_in_once(): void
    {
        [$user, $codes] = $this->userWithTwoFactor();

        $this->signInWithPassword($user);
        $this->post(route('two-factor.challenge'), ['recovery_code' => 'aaaaa-bbbbb'])->assertSessionHasErrors('recovery_code');
        $this->post(route('two-factor.challenge'), ['recovery_code' => strtoupper($codes[0])])->assertRedirect();
        $this->assertAuthenticatedAs($user);
        $this->assertCount(7, $user->fresh()->two_factor_recovery_codes);

        $this->post('/logout');
        $this->signInWithPassword($user);
        $this->post(route('two-factor.challenge'), ['recovery_code' => $codes[0]])->assertSessionHasErrors('recovery_code');
        $this->assertGuest();
    }

    public function test_the_prompt_gives_up_after_too_many_wrong_codes_or_too_long(): void
    {
        [$user] = $this->userWithTwoFactor();

        $this->signInWithPassword($user);
        foreach (range(1, 5) as $attempt) {
            $this->post(route('two-factor.challenge'), ['code' => '000000'])->assertSessionHasErrors('code');
        }
        // Even the right code no longer helps; the sign-in starts over.
        $this->post(route('two-factor.challenge'), ['code' => $this->codeFor($user)])->assertRedirect(route('login'));
        $this->assertGuest();
        $this->get(route('two-factor.challenge'))->assertRedirect(route('login'));

        // Left open past its time.
        $other = $this->userWithTwoFactor()[0];
        $this->signInWithPassword($other);
        $this->travel(TwoFactor::CHALLENGE_MINUTES + 1)->minutes();
        $this->post(route('two-factor.challenge'), ['code' => $this->codeFor($other)])->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_the_prompt_is_not_reachable_without_a_password_first(): void
    {
        [$user] = $this->userWithTwoFactor();

        $this->get(route('two-factor.challenge'))->assertRedirect(route('login'));
        $this->post(route('two-factor.challenge'), ['code' => $this->codeFor($user)])->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_an_account_blocked_at_the_prompt_does_not_get_in(): void
    {
        [$user] = $this->userWithTwoFactor();

        $this->signInWithPassword($user);
        $user->forceFill(['blocked_at' => now()])->save();

        $this->post(route('two-factor.challenge'), ['code' => $this->codeFor($user)])->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_an_admin_lands_in_the_panel_with_a_full_page_load(): void
    {
        [$admin] = $this->userWithTwoFactor();
        $admin->assignRole('admin');

        $this->signInWithPassword($admin);
        $this->withHeader('X-Inertia', 'true')
            ->post(route('two-factor.challenge'), ['code' => $this->codeFor($admin)])
            ->assertStatus(409)
            ->assertHeader('X-Inertia-Location', route('admin.dashboard'));

        $this->assertAuthenticatedAs($admin);
        $this->flushHeaders();
        $this->get(route('admin.dashboard'))->assertInertia(fn ($page) => $page->where('twoFactorEnabled', true));
    }

    public function test_the_panel_reminds_an_admin_without_it(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)->get(route('admin.dashboard'))->assertInertia(fn ($page) => $page->where('twoFactorEnabled', false));
    }

    public function test_signing_in_with_google_owes_the_code_too(): void
    {
        config(['services.google.client_id' => 'test-client', 'services.google.client_secret' => 'test-secret']);
        [$user] = $this->userWithTwoFactor(['email' => 'milica@example.com', 'google_id' => 'google-123']);

        Socialite::fake('google', (new GoogleUser)
            ->setRaw(['sub' => 'google-123', 'email' => 'milica@example.com', 'email_verified' => true, 'name' => 'Milica'])
            ->map(['id' => 'google-123', 'name' => 'Milica', 'email' => 'milica@example.com']));

        $this->get(route('auth.google.callback'))->assertRedirect(route('two-factor.challenge'));
        $this->assertGuest();

        $this->post(route('two-factor.challenge'), ['code' => $this->codeFor($user)])->assertRedirect();
        $this->assertAuthenticatedAs($user);
    }

    public function test_turning_it_off_and_new_recovery_codes_ask_for_the_password(): void
    {
        [$user, $codes] = $this->userWithTwoFactor();

        $this->actingAs($user)->post(route('two-factor.recovery-codes'), ['current_password' => 'wrong'])->assertSessionHasErrors('current_password');
        $this->actingAs($user)->delete(route('two-factor.destroy'), ['current_password' => 'wrong'])->assertSessionHasErrors('current_password');
        $this->assertTrue($user->fresh()->hasTwoFactor());

        $this->actingAs($user)->post(route('two-factor.recovery-codes'), ['current_password' => 'password'])
            ->assertSessionHas('two_factor.recovery_codes', fn (array $new) => count($new) === 8 && array_intersect($new, $codes) === []);

        $this->actingAs($user)->delete(route('two-factor.destroy'), ['current_password' => 'password'])->assertSessionHasNoErrors();
        $this->assertFalse($user->fresh()->hasTwoFactor());
        $this->assertNull($user->fresh()->two_factor_secret);

        // And a password is enough again.
        $this->post('/logout');
        $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertRedirect(route('home', absolute: false));
        $this->assertAuthenticatedAs($user);
    }

    public function test_an_account_without_a_password_sets_one_first(): void
    {
        $user = User::factory()->create(['password' => null]);

        $this->actingAs($user)->get(route('two-factor.edit'))->assertInertia(fn ($page) => $page->where('hasPassword', false));
        $this->actingAs($user)->post(route('two-factor.store'), ['current_password' => 'anything'])->assertSessionHasErrors('current_password');
        $this->assertNull($user->fresh()->two_factor_secret);
    }
}
