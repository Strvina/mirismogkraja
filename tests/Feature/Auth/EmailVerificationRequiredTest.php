<?php

namespace Tests\Feature\Auth;

use App\Models\Product;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/** An account reaches other people only from a confirmed address. */
class EmailVerificationRequiredTest extends TestCase
{
    use RefreshDatabase;

    public function test_registering_sends_the_confirmation_link(): void
    {
        Notification::fake();
        $this->seed(RolesSeeder::class);

        $this->post('/register', [
            'name' => 'Marko Marković',
            'email' => 'marko@example.com',
            'password' => 'lozinka-123',
            'password_confirmation' => 'lozinka-123',
        ]);

        Notification::assertSentTo(User::firstWhere('email', 'marko@example.com'), VerifyEmail::class);
    }

    public function test_an_unconfirmed_account_can_browse_but_not_write_to_anyone(): void
    {
        $user = User::factory()->unverified()->create();
        $product = Product::factory()->create();

        $this->actingAs($user)->get('/')->assertOk();
        $this->actingAs($user)->get(route('favorites.index'))->assertOk();

        $this->actingAs($user)->get(route('producers.create'))->assertRedirect(route('verification.notice'));
        $this->actingAs($user)->get(route('messages.index'))->assertRedirect(route('verification.notice'));
        $this->actingAs($user)
            ->post(route('inquiries.store', $product), ['body' => 'Zdravo'])
            ->assertRedirect(route('verification.notice'));

        $this->assertDatabaseCount('producer_messages', 0);
    }

    public function test_a_new_email_address_has_to_be_confirmed_again(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->actingAs($user)->patch('/settings/profile', ['name' => $user->name, 'email' => 'novi@example.com']);

        $this->assertNull($user->fresh()->email_verified_at);
        Notification::assertSentTo($user, VerifyEmail::class);
    }
}
