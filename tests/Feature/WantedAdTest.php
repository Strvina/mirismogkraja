<?php

namespace Tests\Feature;

use App\Http\Middleware\ThrottlePerRoute;
use App\Jobs\NotifyProducersOfWantedAd;
use App\Models\Category;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Models\WantedAd;
use App\Services\WantedAdService;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

/**
 * "Tražim": a buyer writes what they are looking for, and producers answer
 * in the ordinary conversation between the two.
 */
class WantedAdTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $buyer;

    private Category $honey;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ThrottlePerRoute::class);
        $this->seed(RolesSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
        $this->buyer = User::factory()->create(['name' => 'Marko Marković', 'city' => 'Niš']);
        $this->honey = Category::factory()->create(['name' => 'Med', 'slug' => 'med']);
    }

    /** @return array<string, mixed> */
    private function form(array $overrides = []): array
    {
        return [
            'title' => 'Bagremov med, 10 kg',
            'body' => 'Treba mi za zimu, najbolje iz okoline Niša. Mogu da dođem po njega.',
            'category_id' => $this->honey->id,
            'quantity' => '10 kg',
            'city' => 'Niš',
            ...$overrides,
        ];
    }

    private function ad(?User $author = null, array $attributes = []): WantedAd
    {
        return ($author ?? $this->buyer)->wantedAds()->create([
            'title' => 'Bagremov med, 10 kg',
            'body' => 'Treba mi za zimu, najbolje iz okoline Niša.',
            'category_id' => $this->honey->id,
            'status' => WantedAd::STATUS_OPEN,
            'expires_at' => now()->addDays(WantedAd::DAYS_OPEN),
            ...$attributes,
        ]);
    }

    private function producerSelling(Category $category, array $attributes = []): Producer
    {
        $producer = Producer::factory()->active()->create($attributes);
        Product::factory()->for($producer)->create(['category_id' => $category->id, 'status' => 'active']);

        return $producer;
    }

    public function test_a_buyer_posts_an_ad_and_it_is_public_at_once(): void
    {
        Bus::fake([NotifyProducersOfWantedAd::class]);

        $this->actingAs($this->buyer)->get(route('wanted.create', ['q' => 'bagremov  med']))
            ->assertInertia(fn ($page) => $page->component('wanted/create')->where('suggestedTitle', 'bagremov med')->where('city', 'Niš'));

        $this->actingAs($this->buyer)->post(route('wanted.store'), $this->form())->assertRedirect(route('wanted.show', WantedAd::sole()));

        $ad = WantedAd::sole();
        $this->assertSame(WantedAd::STATUS_OPEN, $ad->status);
        $this->assertTrue($ad->expires_at->isSameDay(now()->addDays(WantedAd::DAYS_OPEN)));
        Bus::assertDispatchedAfterResponse(NotifyProducersOfWantedAd::class);
        $this->assertSame('admin.wanted-posted', $this->admin->notifications()->sole()->data['type']);

        $this->app['auth']->forgetGuards();
        $this->get(route('wanted.index'))->assertOk()->assertInertia(fn ($page) => $page
            ->component('wanted/index')
            ->has('ads.data', 1)
            ->where('ads.data.0.title', 'Bagremov med, 10 kg')
            // A first name, never the account behind it.
            ->where('ads.data.0.author', 'Marko')
            ->missing('ads.data.0.user')
            ->missing('ads.data.0.user_id')
            ->where('mine', []));
        $this->get(route('wanted.show', $ad))->assertOk()->assertInertia(fn ($page) => $page
            ->where('ad.body', $ad->body)
            ->where('isAuthor', false)
            ->where('canRespond', false)
            ->where('responders', []));
        $this->get(route('sitemap.pages'))->assertSee(route('wanted.index'), false);
    }

    public function test_an_ad_needs_an_account_a_confirmed_address_and_something_to_say(): void
    {
        $this->post(route('wanted.store'), $this->form())->assertRedirect(route('login'));
        $this->actingAs(User::factory()->unverified()->create())->post(route('wanted.store'), $this->form())->assertRedirect();
        $this->assertSame(0, WantedAd::count());

        $this->actingAs($this->buyer)->post(route('wanted.store'), $this->form(['title' => 'Med', 'body' => 'Treba mi.', 'category_id' => 999]))
            ->assertSessionHasErrors(['title', 'body', 'category_id']);
    }

    public function test_one_person_keeps_only_a_few_ads_open(): void
    {
        foreach (range(1, WantedAd::MAX_OPEN_PER_USER) as $number) {
            $this->actingAs($this->buyer)->post(route('wanted.store'), $this->form(['title' => "Oglas broj {$number}"]))->assertSessionHasNoErrors();
        }

        $this->actingAs($this->buyer)->post(route('wanted.store'), $this->form())->assertSessionHasErrors('title');

        // Closing one makes room again.
        $this->actingAs($this->buyer)->patch(route('wanted.close', WantedAd::first()))->assertSessionHasNoErrors();
        $this->actingAs($this->buyer)->post(route('wanted.store'), $this->form())->assertSessionHasNoErrors();
    }

    public function test_only_open_unexpired_ads_of_people_in_good_standing_are_listed(): void
    {
        $shown = $this->ad();
        $closed = $this->ad(attributes: ['status' => WantedAd::STATUS_CLOSED]);
        $blocked = $this->ad(attributes: ['status' => WantedAd::STATUS_BLOCKED]);
        $expired = $this->ad(attributes: ['expires_at' => now()->subDay()]);
        $fromBlocked = $this->ad(User::factory()->create(['blocked_at' => now()]));
        $departed = User::factory()->create();
        $fromDeparted = $this->ad($departed);
        $departed->delete();

        $this->get(route('wanted.index'))->assertInertia(fn ($page) => $page->has('ads.data', 1)->where('ads.data.0.id', $shown->id));

        foreach ([$closed, $blocked, $expired, $fromBlocked, $fromDeparted] as $hidden) {
            $this->get(route('wanted.show', $hidden))->assertNotFound();
        }

        // The author still sees their own, and how each one stands.
        $this->actingAs($this->buyer)->get(route('wanted.show', $closed))->assertOk()
            ->assertInertia(fn ($page) => $page->where('isAuthor', true)->where('ad.state', 'closed'));
        $this->actingAs($this->buyer)->get(route('wanted.index'))->assertInertia(fn ($page) => $page
            ->has('mine', 4)
            ->where('mine', fn ($mine) => collect($mine)->pluck('state')->sort()->values()->all() === ['blocked', 'closed', 'expired', 'open']));
    }

    public function test_the_list_filters_by_category_and_place(): void
    {
        $cheese = Category::factory()->create();
        $this->ad(attributes: ['city' => 'Niš']);
        $this->ad(attributes: ['city' => 'Leskovac', 'category_id' => $cheese->id]);

        $this->get(route('wanted.index', ['kategorija' => $cheese->id]))->assertInertia(fn ($page) => $page
            ->has('ads.data', 1)->where('ads.data.0.city', 'Leskovac')->where('cities', ['Leskovac', 'Niš']));
        $this->get(route('wanted.index', ['mesto' => 'Niš']))->assertInertia(fn ($page) => $page->has('ads.data', 1)->where('ads.data.0.city', 'Niš'));
    }

    public function test_producers_selling_in_the_category_are_told_once_each(): void
    {
        $owner = User::factory()->create();
        $this->producerSelling($this->honey, ['user_id' => $owner->id]);
        $this->producerSelling($this->honey, ['user_id' => $owner->id]);
        $elsewhere = $this->producerSelling(Category::factory()->create());
        $pending = Producer::factory()->create(['status' => 'pending']);
        Product::factory()->for($pending)->create(['category_id' => $this->honey->id, 'status' => 'active']);
        // The buyer sells honey too: nobody is told about their own ad.
        $this->producerSelling($this->honey, ['user_id' => $this->buyer->id]);

        $ad = $this->ad();
        (new NotifyProducersOfWantedAd($ad))->handle();

        $this->assertSame('wanted.posted', $owner->notifications()->sole()->data['type']);
        $this->assertSame(0, $elsewhere->user->notifications()->count());
        $this->assertSame(0, $pending->user->notifications()->count());
        $this->assertSame(0, $this->buyer->notifications()->count());

        // No category: listed, but nobody is rung.
        (new NotifyProducersOfWantedAd($this->ad(attributes: ['category_id' => null])))->handle();
        $this->assertSame(1, $owner->notifications()->count());
    }

    public function test_a_producer_answers_into_a_conversation_with_the_buyer(): void
    {
        $producer = $this->producerSelling($this->honey);
        $ad = $this->ad();

        $this->actingAs($producer->user)->get(route('wanted.show', $ad))->assertInertia(fn ($page) => $page
            ->where('canRespond', true)
            ->where('producers', [['id' => $producer->id, 'name' => $producer->name, 'answered' => false]]));

        $this->actingAs($producer->user)
            ->post(route('wanted.respond', $ad), ['producer_id' => $producer->id, 'body' => 'Imamo bagremov med, 900 din/kg.'])
            ->assertRedirect(route('messages.thread', [$producer->id, $this->buyer->id]));

        $message = ProducerMessage::sole();
        $this->assertSame([$producer->id, $this->buyer->id, $producer->user_id, $ad->id], [$message->producer_id, $message->buyer_id, $message->sender_id, $message->wanted_ad_id]);

        // Once per ad; what follows is the conversation.
        $this->actingAs($producer->user)
            ->post(route('wanted.respond', $ad), ['producer_id' => $producer->id, 'body' => 'Još jednom.'])
            ->assertSessionHasErrors('body');
        $this->actingAs($producer->user)->get(route('wanted.show', $ad))
            ->assertInertia(fn ($page) => $page->where('producers.0.answered', true));

        // The buyer sees who answered, reads it with the ad it answers, and writes back.
        $this->actingAs($this->buyer)->get(route('wanted.show', $ad))->assertInertia(fn ($page) => $page
            ->where('ad.responses_count', 1)
            ->where('responders.0.id', $producer->id));
        $this->actingAs($this->buyer)->get(route('messages.show', $producer->slug))->assertOk()
            ->assertInertia(fn ($page) => $page->where('messages.data.0.wanted_ad', ['id' => $ad->id, 'title' => $ad->title]));
        $this->actingAs($this->buyer)->post(route('messages.store', $producer->slug), ['body' => 'Može, kada mogu da dođem?'])
            ->assertSessionHasNoErrors();
        $this->assertSame(2, ProducerMessage::count());
    }

    public function test_an_offer_alone_does_not_earn_a_review(): void
    {
        $producer = $this->producerSelling($this->honey);
        app(WantedAdService::class)->respond($this->ad(), $producer, 'Imamo med.');

        // The producer wrote first; until the buyer answers, it is an offer, not a deal.
        $this->assertFalse($this->buyer->can('create', [Review::class, $producer]));

        ProducerMessage::create(['producer_id' => $producer->id, 'buyer_id' => $this->buyer->id, 'sender_id' => $this->buyer->id, 'body' => 'Uzimam.']);
        $this->assertTrue($this->buyer->can('create', [Review::class, $producer]));
    }

    public function test_who_cannot_answer_an_ad(): void
    {
        $ad = $this->ad();
        $producer = $this->producerSelling($this->honey);
        $answer = fn (User $as, Producer $with, ?WantedAd $to = null) => $this->actingAs($as)
            ->post(route('wanted.respond', $to ?? $ad), ['producer_id' => $with->id, 'body' => 'Imamo med.']);

        // With someone else's producer.
        $answer(User::factory()->create(), $producer)->assertForbidden();
        // With a producer not approved yet.
        $pending = Producer::factory()->create(['status' => 'pending']);
        $answer($pending->user, $pending)->assertForbidden();
        // Their own ad.
        $own = $this->producerSelling($this->honey, ['user_id' => $this->buyer->id]);
        $answer($this->buyer, $own)->assertForbidden();
        // An ad that is closed.
        $answer($producer->user, $producer, $this->ad(attributes: ['status' => WantedAd::STATUS_CLOSED]))->assertForbidden();
        // A buyer who has closed the conversation with this producer.
        $producer->blockedBuyers()->attach($this->buyer->id, ['blocked_by' => 'buyer']);
        $answer($producer->user, $producer)->assertForbidden();

        $this->assertSame(0, ProducerMessage::count());
    }

    public function test_a_producer_answers_only_so_many_ads_a_day(): void
    {
        $producer = $this->producerSelling($this->honey);
        $ads = app(WantedAdService::class);

        foreach (range(1, WantedAdService::RESPONSES_PER_DAY) as $number) {
            $ads->respond($this->ad(User::factory()->create()), $producer, "Ponuda {$number}");
        }

        $this->actingAs($producer->user)
            ->post(route('wanted.respond', $this->ad()), ['producer_id' => $producer->id, 'body' => 'Još jedna.'])
            ->assertSessionHasErrors('body');
    }

    public function test_the_author_closes_and_deletes_and_nobody_else_does(): void
    {
        $ad = $this->ad();
        $stranger = User::factory()->create();

        $this->actingAs($stranger)->patch(route('wanted.close', $ad))->assertForbidden();
        $this->actingAs($stranger)->delete(route('wanted.destroy', $ad))->assertForbidden();

        $this->actingAs($this->buyer)->patch(route('wanted.close', $ad))->assertRedirect();
        $this->assertSame(WantedAd::STATUS_CLOSED, $ad->refresh()->status);

        $this->actingAs($this->buyer)->delete(route('wanted.destroy', $ad))->assertRedirect(route('wanted.index'));
        $this->assertDatabaseMissing('wanted_ads', ['id' => $ad->id]);
    }

    public function test_an_admin_takes_an_ad_down_and_only_an_admin_puts_it_back(): void
    {
        $ad = $this->ad();

        $this->actingAs($this->buyer)->get(route('admin.wanted.index'))->assertForbidden();
        $this->actingAs($this->buyer)->patch(route('admin.wanted.status', $ad), ['status' => 'blocked'])->assertForbidden();

        $this->actingAs($this->admin)->get(route('admin.wanted.index'))->assertInertia(fn ($page) => $page
            ->component('admin/wanted/index')
            ->has('ads.data', 1)
            ->where('ads.data.0.author', 'Marko Marković')
            ->where('counts.open', 1));

        $this->actingAs($this->admin)->patch(route('admin.wanted.status', $ad), ['status' => 'blocked'])->assertRedirect();
        $this->assertSame(WantedAd::STATUS_BLOCKED, $ad->refresh()->status);
        $this->assertSame('wanted.blocked', $this->buyer->notifications()->sole()->data['type']);

        // The author's "close" is not a way around a block.
        $this->actingAs($this->buyer)->patch(route('wanted.close', $ad));
        $this->assertSame(WantedAd::STATUS_BLOCKED, $ad->refresh()->status);

        $this->actingAs($this->admin)->patch(route('admin.wanted.status', $ad), ['status' => 'open'])->assertRedirect();
        $this->assertSame(WantedAd::STATUS_OPEN, $ad->refresh()->status);

        // "Put back" undoes a block; it does not reopen what the author closed.
        $ad->update(['status' => WantedAd::STATUS_CLOSED]);
        $this->actingAs($this->admin)->patch(route('admin.wanted.status', $ad), ['status' => 'open'])->assertStatus(422);

        $this->actingAs($this->admin)->delete(route('admin.wanted.destroy', $ad))->assertRedirect();
        $this->assertDatabaseMissing('wanted_ads', ['id' => $ad->id]);
    }
}
