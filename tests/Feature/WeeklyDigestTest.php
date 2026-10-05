<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use App\Notifications\WeeklyDigest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/** Once a week, a follower hears what the producers they follow have added. */
class WeeklyDigestTest extends TestCase
{
    use RefreshDatabase;

    private function follower(Producer $producer, array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        $user->followedProducers()->attach($producer);

        return $user;
    }

    private function product(Producer $producer, string $name, int $daysAgo = 1, string $status = 'active'): Product
    {
        $product = Product::factory()->for($producer)->create(['name' => $name, 'status' => $status]);
        $product->forceFill(['published_at' => now()->subDays($daysAgo)])->save();

        return $product;
    }

    private function story(Producer $producer, string $title): Post
    {
        $post = $producer->posts()->create([
            'type' => 'story', 'title' => $title, 'slug' => str($title)->slug(), 'body' => 'Tekst priče.', 'status' => 'published',
        ]);
        $post->forceFill(['published_at' => now()->subDay()])->save();

        return $post;
    }

    /** The mail's lines as one string, as the reader gets them. */
    private function textOf(WeeklyDigest $mail, User $user): string
    {
        $message = $mail->toMail($user);

        return implode("\n", [...$message->introLines, ...$message->outroLines]);
    }

    public function test_a_follower_is_told_what_the_producer_added_this_week(): void
    {
        Notification::fake();
        $producer = Producer::factory()->active()->create(['name' => 'Pčelarstvo Jovanović']);
        $other = Producer::factory()->active()->create(['name' => 'Sirana Petrović']);
        $follower = $this->follower($producer);
        $stranger = User::factory()->create();

        $honey = $this->product($producer, 'Bagremov med');
        $this->product($producer, 'Prošlogodišnji med', daysAgo: 20);
        $this->product($producer, 'Još u pripremi', status: 'draft');
        $this->product($other, 'Kozji sir');
        $story = $this->story($producer, 'Kako vrcamo med');

        $this->artisan('digest:send-weekly')->assertSuccessful();

        Notification::assertSentToTimes($follower, WeeklyDigest::class, 1);
        Notification::assertNotSentTo($stranger, WeeklyDigest::class);
        Notification::assertSentTo($follower, WeeklyDigest::class, function (WeeklyDigest $mail) use ($follower, $producer, $honey, $story) {
            $text = $this->textOf($mail, $follower);

            return $mail->toMail($follower)->subject === 'Novo od proizvođača koje pratite'
                && str_contains($text, route('marketplace.producers.show', $producer->slug))
                && str_contains($text, '[Bagremov med]('.route('marketplace.products.show', $honey->slug).')')
                && str_contains($text, '[Kako vrcamo med]('.route('marketplace.posts.show', $story->slug).')')
                // Older than a week, not public, or from someone they do not follow.
                && ! str_contains($text, 'Prošlogodišnji')
                && ! str_contains($text, 'Još u pripremi')
                && ! str_contains($text, 'Kozji sir');
        });

        $this->assertNotNull($follower->fresh()->digest_sent_at);
    }

    public function test_nobody_gets_an_empty_mail_or_two_in_one_week(): void
    {
        Notification::fake();
        $producer = Producer::factory()->active()->create();
        $follower = $this->follower($producer);

        // Nothing new: nothing sent.
        $this->artisan('digest:send-weekly');
        Notification::assertNothingSent();

        $this->product($producer, 'Ajvar');
        $this->artisan('digest:send-weekly');
        $this->artisan('digest:send-weekly');
        Notification::assertSentToTimes($follower, WeeklyDigest::class, 1);

        // A week on, with something new again.
        $this->travel(7)->days();
        $this->product($producer, 'Pinđur');
        $this->artisan('digest:send-weekly');
        Notification::assertSentToTimes($follower, WeeklyDigest::class, 2);
    }

    public function test_it_goes_only_to_people_who_can_and_want_to_get_it(): void
    {
        Notification::fake();
        $producer = Producer::factory()->active()->create();
        $this->product($producer, 'Ajvar');

        $optedOut = $this->follower($producer, ['notify_weekly_digest' => false]);
        $unverified = $this->follower($producer, ['email_verified_at' => null]);
        $blocked = $this->follower($producer, ['blocked_at' => now()]);
        $gone = $this->follower($producer);
        $gone->delete();
        $reader = $this->follower($producer);

        $this->artisan('digest:send-weekly');

        Notification::assertSentTo($reader, WeeklyDigest::class);
        Notification::assertNotSentTo([$optedOut, $unverified, $blocked, $gone], WeeklyDigest::class);
    }

    /** A name is producer-written text inside a mail the platform sends. */
    public function test_a_name_cannot_smuggle_a_link_into_the_mail(): void
    {
        Notification::fake();
        $producer = Producer::factory()->active()->create();
        $follower = $this->follower($producer);
        $this->product($producer, '[Besplatno](http://evil.test)');

        $this->artisan('digest:send-weekly');

        Notification::assertSentTo($follower, WeeklyDigest::class, function (WeeklyDigest $mail) use ($follower) {
            $text = $this->textOf($mail, $follower);

            return str_contains($text, '\[Besplatno\]\(http://evil\.test\)') && ! str_contains($text, '](http://evil.test)');
        });
    }

    public function test_the_signed_link_turns_the_digest_off_but_only_on_the_button(): void
    {
        $user = User::factory()->create();
        $link = URL::signedRoute('digest.unsubscribe', ['user' => $user->id]);

        $this->get($link)->assertOk()->assertInertia(fn ($page) => $page
            ->component('notifications/unsubscribe')
            ->where('kind', 'digest')
            ->where('done', false));
        $this->assertTrue($user->fresh()->notify_weekly_digest);

        $this->post($link)->assertRedirect();
        $this->assertFalse($user->fresh()->notify_weekly_digest);
        // The other kind of mail is a separate choice.
        $this->assertTrue($user->fresh()->notify_messages_by_email);

        $this->post(route('digest.unsubscribe.store', ['user' => User::factory()->create()->id]))->assertForbidden();
    }

    public function test_the_setting_can_be_changed_in_the_profile(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->patch('/settings/profile', ['name' => $user->name, 'email' => $user->email, 'notify_weekly_digest' => false])
            ->assertSessionHasNoErrors();

        $this->assertFalse($user->fresh()->notify_weekly_digest);
    }
}
