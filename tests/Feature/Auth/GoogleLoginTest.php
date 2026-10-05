<?php

namespace Tests\Feature\Auth;

use App\Models\Producer;
use App\Models\Referral;
use App\Models\User;
use App\Services\ReferralService;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Laravel\Socialite\Two\User as GoogleUser;
use Tests\TestCase;

class GoogleLoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesSeeder::class);
        config(['services.google.client_id' => 'test-client', 'services.google.client_secret' => 'test-secret']);
    }

    /** What Google would send back for this person. */
    private function googleSays(string $email = 'milica@example.com', string $id = 'google-123', bool $verified = true, string $name = 'Milica Nikolić'): void
    {
        Socialite::fake('google', (new GoogleUser)
            ->setRaw(['sub' => $id, 'email' => $email, 'email_verified' => $verified, 'name' => $name])
            ->map(['id' => $id, 'name' => $name, 'email' => $email]));
    }

    public function test_the_button_and_its_routes_exist_only_with_keys(): void
    {
        $this->get(route('login'))->assertInertia(fn ($page) => $page->where('googleEnabled', true));
        $this->get(route('register'))->assertInertia(fn ($page) => $page->where('googleEnabled', true));

        config(['services.google.client_secret' => null]);

        $this->get(route('login'))->assertInertia(fn ($page) => $page->where('googleEnabled', false));
        $this->get(route('auth.google'))->assertNotFound();
        $this->get(route('auth.google.callback'))->assertNotFound();
    }

    public function test_the_visitor_is_sent_to_google(): void
    {
        $this->googleSays();

        $this->get(route('auth.google'))->assertRedirect('https://socialite.fake/google/authorize');
    }

    public function test_a_new_visitor_gets_an_account_without_a_password_or_a_verification_mail(): void
    {
        Notification::fake();
        $this->googleSays('Milica@Example.com');

        $this->get(route('auth.google.callback'))->assertRedirect(route('home', absolute: false));

        $user = User::sole();
        $this->assertAuthenticatedAs($user);
        $this->assertSame('milica@example.com', $user->email);
        $this->assertSame('Milica Nikolić', $user->name);
        $this->assertSame('google-123', $user->google_id);
        $this->assertNotNull($user->email_verified_at);
        $this->assertFalse($user->hasPassword());
        $this->assertTrue($user->hasRole('buyer'));
        // Google has already confirmed the address.
        Notification::assertNothingSent();

        // Google's id for them stays on the server.
        $this->get('/')->assertInertia(fn ($page) => $page->where('auth.user.email', 'milica@example.com')->missing('auth.user.google_id')->missing('auth.user.password'));
    }

    public function test_they_are_recognised_next_time_even_under_a_new_address(): void
    {
        $user = User::factory()->create(['email' => 'stara@example.com'])->forceFill(['google_id' => 'google-123']);
        $user->save();

        $this->googleSays('nova@example.com');
        $this->get(route('auth.google.callback'))->assertRedirect();

        $this->assertAuthenticatedAs($user);
        $this->assertSame(1, User::count());
    }

    public function test_an_account_with_a_confirmed_address_is_joined_and_keeps_its_password(): void
    {
        $user = User::factory()->create(['email' => 'milica@example.com', 'password' => 'moja-stara-lozinka']);

        $this->googleSays();
        $this->get(route('auth.google.callback'))->assertRedirect();

        $this->assertAuthenticatedAs($user);
        $this->assertSame('google-123', $user->refresh()->google_id);
        $this->assertTrue(Hash::check('moja-stara-lozinka', $user->password));
    }

    public function test_an_account_someone_else_opened_with_their_address_becomes_theirs(): void
    {
        // Registered with the victim's address and never confirmed - waiting
        // for the real owner to "sign up" into an account whose password the
        // attacker already has.
        $squatted = User::factory()->unverified()->create(['email' => 'milica@example.com', 'password' => 'lozinka-napadaca']);

        $this->googleSays();
        $this->get(route('auth.google.callback'))->assertRedirect();

        $squatted->refresh();
        $this->assertAuthenticatedAs($squatted);
        $this->assertNotNull($squatted->email_verified_at);
        $this->assertFalse($squatted->hasPassword());

        // The password it was opened with opens nothing any more.
        $this->post(route('logout'));
        $this->post(route('login'), ['email' => 'milica@example.com', 'password' => 'lozinka-napadaca'])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_an_address_google_has_not_verified_signs_nobody_in(): void
    {
        $existing = User::factory()->create(['email' => 'milica@example.com']);
        $this->googleSays(verified: false);

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('email');

        $this->assertGuest();
        $this->assertNull($existing->refresh()->google_id);
    }

    public function test_a_blocked_account_stays_out(): void
    {
        User::factory()->create(['email' => 'milica@example.com', 'blocked_at' => now()]);
        $this->googleSays();

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors(['email' => 'Ovaj nalog je blokiran.']);

        $this->assertGuest();
    }

    public function test_an_account_tied_to_another_google_account_is_not_taken_over(): void
    {
        $user = User::factory()->create(['email' => 'milica@example.com'])->forceFill(['google_id' => 'google-prvi']);
        $user->save();

        $this->googleSays(id: 'google-drugi');
        $this->get(route('auth.google.callback'))->assertRedirect(route('login'))->assertSessionHasErrors('email');

        $this->assertGuest();
        $this->assertSame('google-prvi', $user->refresh()->google_id);
    }

    public function test_a_request_that_did_not_start_here_is_turned_away(): void
    {
        Socialite::fake('google', fn () => throw new InvalidStateException);

        $this->get(route('auth.google.callback', ['code' => 'ukraden', 'state' => 'tudji']))
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('email');

        $this->assertGuest();
        $this->assertSame(0, User::count());
    }

    public function test_an_admin_lands_in_the_admin_panel(): void
    {
        $admin = User::factory()->create(['email' => 'milica@example.com']);
        $admin->assignRole('admin');

        $this->googleSays();
        $this->get(route('auth.google.callback'))->assertRedirect(route('admin.dashboard', absolute: false));
    }

    public function test_a_referral_link_counts_for_an_account_opened_with_google(): void
    {
        $referrer = Producer::factory()->active()->create();
        $code = app(ReferralService::class)->codeFor($referrer);

        $this->googleSays();
        $this->withCookie(ReferralService::COOKIE, $code)->get(route('auth.google.callback'))->assertRedirect();

        $this->assertSame($referrer->id, Referral::sole()->referrer_producer_id);

        // But not for an account that already existed.
        $this->post(route('logout'));
        User::factory()->create(['email' => 'postojeci@example.com']);
        $this->googleSays('postojeci@example.com', 'google-456');
        $this->withCookie(ReferralService::COOKIE, $code)->get(route('auth.google.callback'));

        $this->assertSame(1, Referral::count());
    }

    public function test_an_account_without_a_password_can_set_one_and_can_be_deleted(): void
    {
        $this->googleSays();
        $this->get(route('auth.google.callback'));
        $user = User::sole();

        $this->get(route('password.edit'))->assertInertia(fn ($page) => $page->where('hasPassword', false));
        $this->get(route('profile.edit'))->assertInertia(fn ($page) => $page->where('hasPassword', false));

        // Deleting asks for the account's address in place of a password.
        $this->delete(route('profile.destroy'), ['password' => 'nesto-drugo@example.com'])->assertSessionHasErrors('password');
        $this->assertNotSoftDeleted($user);

        // A first password needs no current one...
        $this->put(route('password.update'), ['password' => 'nova-duga-lozinka-123', 'password_confirmation' => 'nova-duga-lozinka-123'])
            ->assertSessionHasNoErrors();
        $this->assertTrue(Hash::check('nova-duga-lozinka-123', $user->refresh()->password));

        // ...and from then on changing it does, like on any account.
        $this->put(route('password.update'), ['password' => 'jos-jedna-lozinka-456', 'password_confirmation' => 'jos-jedna-lozinka-456'])
            ->assertSessionHasErrors('current_password');
    }

    public function test_deleting_a_google_account_frees_it_to_sign_up_again(): void
    {
        $this->googleSays();
        $this->get(route('auth.google.callback'));
        $first = User::sole();

        $this->delete(route('profile.destroy'), ['password' => 'milica@example.com'])->assertRedirect('/');
        $this->assertSoftDeleted($first);
        $this->assertNull($first->refresh()->google_id);

        $this->get(route('auth.google.callback'))->assertRedirect();
        $this->assertNotSame($first->id, auth()->id());
        $this->assertSame('google-123', User::where('email', 'milica@example.com')->sole()->google_id);
    }

    public function test_an_empty_password_opens_no_account(): void
    {
        $this->googleSays();
        $this->get(route('auth.google.callback'));
        $this->post(route('logout'));

        $this->post(route('login'), ['email' => 'milica@example.com', 'password' => ''])->assertSessionHasErrors();
        $this->post(route('login'), ['email' => 'milica@example.com', 'password' => 'null'])->assertSessionHasErrors('email');
        $this->assertGuest();
    }
}
