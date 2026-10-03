<?php

namespace Tests\Feature;

use App\Jobs\PushNewMessage;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\PushSubscription;
use App\Models\User;
use App\Support\Push;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Minishlink\WebPush\MessageSentReport;
use Minishlink\WebPush\WebPush;
use Mockery;
use Tests\TestCase;

class PushNotificationsTest extends TestCase
{
    use RefreshDatabase;

    private const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc123';

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.webpush.public_key' => 'public', 'services.webpush.private_key' => 'private']);
    }

    private function subscribe(User $user, string $endpoint = self::ENDPOINT): void
    {
        $this->actingAs($user)->post(route('push.store'), [
            'endpoint' => $endpoint,
            'keys' => ['p256dh' => 'BPubKey', 'auth' => 'authSecret'],
        ])->assertSessionHasNoErrors();
    }

    public function test_a_device_subscribes_once_and_can_unsubscribe(): void
    {
        $user = User::factory()->create();

        $this->subscribe($user);
        $this->subscribe($user);
        $this->assertSame(1, PushSubscription::count());

        $this->actingAs($user)->post(route('push.store'), ['endpoint' => 'http://insecure.example/x', 'keys' => ['p256dh' => 'a', 'auth' => 'b']])
            ->assertSessionHasErrors('endpoint');

        $this->actingAs($user)->delete(route('push.destroy'), ['endpoint' => self::ENDPOINT]);
        $this->assertSame(0, PushSubscription::count());
    }

    public function test_the_settings_page_gets_the_key_only_when_push_is_on(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('profile.edit'))->assertInertia(fn ($page) => $page->where('pushKey', 'public'));

        config(['services.webpush.private_key' => null]);
        $this->actingAs($user)->get(route('profile.edit'))->assertInertia(fn ($page) => $page->where('pushKey', null));
    }

    public function test_a_new_message_is_pushed_to_the_other_side_only(): void
    {
        $buyer = User::factory()->create(['name' => 'Marko']);
        $producer = Producer::factory()->active()->create();

        Bus::fake();
        $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Imate li meda?']);
        Bus::assertDispatchedAfterResponse(PushNewMessage::class);

        $push = Mockery::mock(Push::class);
        $push->shouldReceive('send')->once()->withArgs(fn (User $to, array $payload) => $to->is($producer->user)
            && $payload['title'] === 'Nova poruka od Marko'
            && $payload['body'] === 'Imate li meda?'
            && $payload['url'] === "/poruke-proizvodjaca/{$producer->id}/{$buyer->id}"
            && $payload['tag'] === "thread-{$producer->id}-{$buyer->id}");

        (new PushNewMessage(ProducerMessage::sole()))->handle($push);
    }

    public function test_a_device_the_push_service_has_forgotten_is_removed(): void
    {
        $user = User::factory()->create();
        $this->subscribe($user);

        $gone = new MessageSentReport(new Request('POST', self::ENDPOINT), new Response(410), false, 'Gone');
        $client = Mockery::mock(WebPush::class);
        $client->shouldReceive('queueNotification')->once();
        $client->shouldReceive('flush')->once()->andReturn((fn () => yield $gone)());

        $push = new class($client) extends Push
        {
            public function __construct(private readonly WebPush $fake) {}

            protected function client(): WebPush
            {
                return $this->fake;
            }
        };

        $this->assertSame(0, $push->send($user, ['title' => 'x']));
        $this->assertSame(0, PushSubscription::count());
    }

    public function test_nothing_is_sent_while_push_is_off(): void
    {
        config(['services.webpush.public_key' => null]);
        Bus::fake();
        $buyer = User::factory()->create();

        $this->actingAs($buyer)->post(route('messages.store', Producer::factory()->active()->create()->slug), ['body' => 'Zdravo']);

        Bus::assertNotDispatched(PushNewMessage::class);
    }

    public function test_the_site_is_installable(): void
    {
        $this->get('/')->assertSee('<link rel="manifest" href="/manifest.webmanifest">', false);

        $manifest = json_decode((string) file_get_contents(public_path('manifest.webmanifest')), true);
        $this->assertSame('standalone', $manifest['display']);
        foreach ($manifest['icons'] as $icon) {
            $this->assertFileExists(public_path(ltrim($icon['src'], '/')));
        }
        $this->assertFileExists(public_path('sw.js'));
    }
}
