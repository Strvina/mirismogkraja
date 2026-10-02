<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class MailTest extends TestCase
{
    use RefreshDatabase;

    /** Laravel's own reset mail speaks the visitor's language, not English. */
    public function test_the_password_reset_mail_is_translated(): void
    {
        $user = User::factory()->create();

        foreach (['sr' => 'Promena lozinke', 'ru' => 'Смена пароля', 'en' => 'Reset Password Notification'] as $locale => $subject) {
            app()->setLocale($locale);
            $this->assertSame($subject, (new ResetPassword('token'))->toMail($user)->subject);
        }
    }

    public function test_the_test_mail_command_sends_through_the_configured_mailer(): void
    {
        config(['mail.default' => 'array']);

        $this->artisan('mail:test', ['to' => 'admin@example.com'])->assertSuccessful();

        $sent = Mail::mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(1, $sent);
        $this->assertSame('admin@example.com', $sent[0]->getEnvelope()->getRecipients()[0]->getAddress());
    }
}
