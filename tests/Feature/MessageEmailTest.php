<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\User;
use App\Notifications\UnreadMessages;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/** A producer hears about an inquiry without having to open the site. */
class MessageEmailTest extends TestCase
{
    use RefreshDatabase;

    private function message(Producer $producer, User $buyer, User $sender, int $minutesAgo = 15, array $extra = []): ProducerMessage
    {
        $message = ProducerMessage::create([
            'household_id' => $producer->id, 'buyer_id' => $buyer->id, 'sender_id' => $sender->id, 'body' => 'Imate li meda?', ...$extra,
        ]);
        $message->forceFill(['created_at' => now()->subMinutes($minutesAgo)])->save();

        return $message;
    }

    public function test_an_unread_inquiry_is_mailed_to_the_producer_once(): void
    {
        Notification::fake();
        $buyer = User::factory()->create(['name' => 'Marko']);
        $producer = Producer::factory()->active()->create();
        $this->message($producer, $buyer, $buyer);
        $this->message($producer, $buyer, $buyer, 12);

        $this->artisan('messages:email-unread')->assertSuccessful();
        $this->artisan('messages:email-unread')->assertSuccessful();

        Notification::assertSentToTimes($producer->user, UnreadMessages::class, 1);
        Notification::assertSentTo($producer->user, UnreadMessages::class, function (UnreadMessages $mail, array $channels, User $notifiable) use ($producer, $buyer) {
            $message = $mail->toMail($notifiable);

            return $message->subject === 'Nova poruka od Marko'
                && $message->actionUrl === route('messages.thread', [$producer->id, $buyer->id]);
        });
        Notification::assertNotSentTo($buyer, UnreadMessages::class);
    }

    public function test_nothing_is_mailed_too_soon_after_reading_or_to_someone_who_turned_it_off(): void
    {
        Notification::fake();
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();

        $this->message($producer, $buyer, $buyer, minutesAgo: 2);
        $this->message($producer, $buyer, $buyer, extra: ['read_at' => now()]);
        $this->artisan('messages:email-unread');
        Notification::assertNothingSent();

        // The producer's reply to a buyer who turned the mails off.
        $buyer->update(['notify_messages_by_email' => false]);
        $this->message($producer, $buyer, $producer->user);
        $this->artisan('messages:email-unread');
        Notification::assertNothingSent();
    }

    public function test_a_still_unread_conversation_is_mailed_again_only_after_a_quiet_period(): void
    {
        Notification::fake();
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();

        $this->message($producer, $buyer, $buyer);
        $this->artisan('messages:email-unread');

        $this->message($producer, $buyer, $buyer, 11);
        $this->artisan('messages:email-unread');
        Notification::assertSentToTimes($producer->user, UnreadMessages::class, 1);

        $this->travel(4)->hours();
        $this->artisan('messages:email-unread');
        Notification::assertSentToTimes($producer->user, UnreadMessages::class, 2);
    }

    public function test_the_mail_is_written_in_the_language_the_person_uses_the_site_in(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->withHeader('Accept-Language', 'ru')->get('/');

        $this->assertSame('ru', $user->fresh()->preferredLocale());
    }

    public function test_the_signed_link_turns_the_mails_off_but_only_on_the_button(): void
    {
        $user = User::factory()->create();
        $link = URL::signedRoute('message-emails.unsubscribe', ['user' => $user->id]);

        $this->get($link)->assertOk()->assertInertia(fn ($page) => $page->component('notifications/unsubscribe')->where('done', false));
        $this->assertTrue($user->fresh()->notify_messages_by_email);

        $this->post($link)->assertRedirect();
        $this->assertFalse($user->fresh()->notify_messages_by_email);

        // Without a valid signature, nothing.
        $this->post(route('message-emails.unsubscribe.store', ['user' => User::factory()->create()->id]))->assertForbidden();
    }

    public function test_the_setting_can_be_changed_in_the_profile(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->patch('/settings/profile', ['name' => $user->name, 'email' => $user->email, 'notify_messages_by_email' => false])
            ->assertSessionHasNoErrors();

        $this->assertFalse($user->fresh()->notify_messages_by_email);
    }
}
