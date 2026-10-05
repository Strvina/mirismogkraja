<?php

namespace Tests\Feature;

use App\Http\Middleware\ThrottlePerRoute;
use App\Jobs\NotifyFollowersOfPost;
use App\Models\Post;
use App\Models\Producer;
use App\Models\Product;
use App\Models\Report;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Stories and recipes. */
class PostTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->seed(RolesSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
    }

    private function body(): string
    {
        return str_repeat('Ajvar pečemo na šporetu na drva, od paprike iz naše bašte. ', 4);
    }

    /** @return array<string, mixed> */
    private function submission(array $overrides = []): array
    {
        return [
            'type' => 'recipe',
            'title' => 'Prženice sa ajvarom',
            'body' => $this->body(),
            'ingredients' => "4 kriške hleba\n\n  2 jaja \n3 kašike ajvara",
            'status' => 'published',
            ...$overrides,
        ];
    }

    private function makePost(Producer $producer, array $attributes = []): Post
    {
        $post = $producer->posts()->create([
            'type' => 'story',
            'title' => 'Kako pravimo sir',
            'slug' => 'kako-pravimo-sir-'.fake()->unique()->randomNumber(5),
            'body' => $this->body(),
            'excerpt' => Post::excerptFrom($this->body()),
            'status' => 'published',
            ...$attributes,
        ]);

        $post->forceFill(['published_at' => $attributes['published_at'] ?? ($post->status === 'draft' ? null : now())])->save();

        return $post;
    }

    public function test_a_producer_publishes_a_recipe_and_everyone_can_read_it(): void
    {
        Bus::fake();
        $producer = Producer::factory()->active()->create(['name' => 'Domaćinstvo Stojanović']);
        $product = Product::factory()->for($producer)->create(['name' => 'Ajvar', 'status' => 'active']);

        $this->actingAs($producer->user)
            ->post(route('producers.posts.store', $producer), $this->submission(['product_id' => $product->id, 'cover_image' => $this->fakeImage('ajvar.png')]))
            ->assertRedirect(route('producers.posts.index', $producer))
            ->assertSessionHasNoErrors();

        $post = $producer->posts()->sole();
        $this->assertSame('przenice-sa-ajvarom', $post->slug);
        $this->assertNotNull($post->published_at);
        Storage::disk('public')->assertExists($post->cover_image_path);

        // Followers hear after the response; admins see what went up.
        Bus::assertDispatchedAfterResponse(NotifyFollowersOfPost::class);
        $this->assertContains('admin.post-published', $this->admin->notifications()->get()->pluck('data.type')->all());

        $this->app['auth']->forgetGuards();

        $response = $this->get(route('marketplace.posts.show', $post->slug))->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('marketplace/posts/show')
            ->where('post.title', 'Prženice sa ajvarom')
            // One per non-empty line, trimmed.
            ->where('post.ingredients', ['4 kriške hleba', '2 jaja', '3 kašike ajvara'])
            ->where('product.name', 'Ajvar')
            ->where('producer.name', 'Domaćinstvo Stojanović')
            ->where('isPreview', false)
            ->missing('producer.user_id'));
        $response->assertSee('"@type":"Recipe"', false);
        $response->assertSee('og:type" content="article"', false);

        $this->get(route('marketplace.posts.index'))
            ->assertInertia(fn ($page) => $page->component('marketplace/posts/index')->where('posts.data.0.title', 'Prženice sa ajvarom'));
        $this->get(route('marketplace.producers.show', $producer->slug))->assertInertia(fn ($page) => $page->has('posts', 1));
        $this->get('/')->assertInertia(fn ($page) => $page->has('latestPosts', 1));
        $this->get(route('sitemap.section', ['posts', 1]))->assertOk()->assertSee(route('marketplace.posts.show', $post->slug), false);
    }

    public function test_followers_are_told_once_it_is_public(): void
    {
        $producer = Producer::factory()->active()->create();
        $follower = User::factory()->create();
        $producer->followers()->attach($follower);

        (new NotifyFollowersOfPost($this->makePost($producer, ['status' => 'draft'])))->handle();
        $this->assertSame(0, $follower->notifications()->count());

        (new NotifyFollowersOfPost($this->makePost($producer)))->handle();
        $this->assertSame('post.published', $follower->notifications()->sole()->data['type']);
    }

    public function test_a_draft_is_for_its_author_and_admins_only(): void
    {
        $producer = Producer::factory()->active()->create();
        $draft = $this->makePost($producer, ['status' => 'draft']);

        $this->get(route('marketplace.posts.show', $draft->slug))->assertNotFound();
        $this->actingAs(User::factory()->create())->get(route('marketplace.posts.show', $draft->slug))->assertNotFound();

        $this->actingAs($producer->user)->get(route('marketplace.posts.show', $draft->slug))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('isPreview', true));
        $this->actingAs($this->admin)->get(route('marketplace.posts.show', $draft->slug))->assertOk();

        $this->app['auth']->forgetGuards();
        $this->get(route('marketplace.posts.index'))->assertInertia(fn ($page) => $page->where('posts.total', 0));
        $this->get(route('marketplace.producers.show', $producer->slug))->assertInertia(fn ($page) => $page->has('posts', 0));
    }

    public function test_a_post_is_public_only_while_its_producer_is(): void
    {
        $pending = Producer::factory()->create(['status' => 'pending']);

        $this->actingAs($pending->user)->post(route('producers.posts.store', $pending), $this->submission())->assertSessionHasNoErrors();
        $post = $pending->posts()->sole();

        $this->app['auth']->forgetGuards();
        $this->get(route('marketplace.posts.show', $post->slug))->assertNotFound();
        $this->get(route('marketplace.posts.index'))->assertInertia(fn ($page) => $page->where('posts.total', 0));

        // It goes up with the producer's page, dated from when it was written.
        $pending->update(['status' => 'active']);
        $this->get(route('marketplace.posts.show', $post->slug))->assertOk();
        $this->assertNotNull($post->refresh()->published_at);
    }

    public function test_the_list_filters_by_kind_and_by_producer(): void
    {
        $first = Producer::factory()->active()->create();
        $second = Producer::factory()->active()->create();
        $this->makePost($first, ['type' => 'story', 'title' => 'Priča prvog', 'published_at' => now()->subDays(2)]);
        $this->makePost($first, ['type' => 'recipe', 'title' => 'Recept prvog', 'published_at' => now()->subDay()]);
        $this->makePost($second, ['type' => 'recipe', 'title' => 'Recept drugog', 'published_at' => now()]);

        $this->get(route('marketplace.posts.index', ['vrsta' => 'recept']))
            ->assertInertia(fn ($page) => $page->where('posts.total', 2)->where('posts.data.0.title', 'Recept drugog')->where('filters.vrsta', 'recept'));
        $this->get(route('marketplace.posts.index', ['proizvodjac' => $first->slug]))
            ->assertInertia(fn ($page) => $page->where('posts.total', 2)->where('filters.producer.name', $first->name));
        $this->get(route('marketplace.posts.index', ['vrsta' => 'recept', 'proizvodjac' => $first->slug]))
            ->assertInertia(fn ($page) => $page->where('posts.total', 1)->where('posts.data.0.title', 'Recept prvog'));
        // An unknown filter is ignored rather than answered with an empty page.
        $this->get(route('marketplace.posts.index', ['vrsta' => 'nesto', 'proizvodjac' => 'nema-ga']))
            ->assertInertia(fn ($page) => $page->where('posts.total', 3)->where('filters.vrsta', null));
    }

    public function test_what_is_written_is_validated(): void
    {
        $this->withoutMiddleware(ThrottlePerRoute::class);

        $producer = Producer::factory()->active()->create();
        $foreign = Product::factory()->for(Producer::factory()->active())->create(['status' => 'active']);
        $this->actingAs($producer->user);
        $send = fn (array $overrides) => $this->post(route('producers.posts.store', $producer), $this->submission($overrides));

        $send(['title' => ''])->assertSessionHasErrors('title');
        $send(['body' => 'Kratko.'])->assertSessionHasErrors('body');
        $send(['body' => str_repeat('a', Post::BODY_MAX + 1)])->assertSessionHasErrors('body');
        $send(['type' => 'oglas'])->assertSessionHasErrors('type');
        // Blocked is an administrator's word.
        $send(['status' => 'blocked'])->assertSessionHasErrors('status');
        // Only one of the producer's own products can be linked.
        $send(['product_id' => $foreign->id])->assertSessionHasErrors('product_id');
        $send(['cover_image' => $this->fakeImage('velika.png', 6000, 10)])->assertSessionHasErrors('cover_image');

        $this->assertDatabaseCount('posts', 0);

        // A story keeps no ingredients, whatever was sent with it.
        $send(['type' => 'story'])->assertSessionHasNoErrors();
        $this->assertNull($producer->posts()->sole()->ingredients);
    }

    public function test_only_the_owner_writes_edits_and_deletes(): void
    {
        $producer = Producer::factory()->active()->create();
        $post = $this->makePost($producer);
        $other = Producer::factory()->active()->create();
        $this->actingAs($other->user);

        $this->get(route('producers.posts.index', $producer))->assertForbidden();
        $this->get(route('producers.posts.create', $producer))->assertForbidden();
        $this->post(route('producers.posts.store', $producer), $this->submission())->assertForbidden();
        $this->get(route('producers.posts.edit', [$producer, $post]))->assertForbidden();
        $this->put(route('producers.posts.update', [$producer, $post]), $this->submission())->assertForbidden();
        $this->delete(route('producers.posts.destroy', [$producer, $post]))->assertForbidden();

        // Nor through a producer of their own.
        $this->get(route('producers.posts.edit', [$other, $post]))->assertNotFound();
        $this->put(route('producers.posts.update', [$other, $post]), $this->submission())->assertNotFound();
        $this->delete(route('producers.posts.destroy', [$other, $post]))->assertNotFound();

        $this->assertSame('Kako pravimo sir', $post->refresh()->title);
    }

    public function test_editing_renames_the_address_and_swaps_the_photo(): void
    {
        $producer = Producer::factory()->active()->create();
        $this->actingAs($producer->user);
        $this->post(route('producers.posts.store', $producer), $this->submission(['cover_image' => $this->fakeImage('prva.png')]));
        $post = $producer->posts()->sole();
        $firstCover = $post->cover_image_path;

        $this->get(route('producers.posts.edit', [$producer, $post]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('posts/edit')->where('post.title', 'Prženice sa ajvarom'));

        $this->put(route('producers.posts.update', [$producer, $post]), $this->submission(['title' => 'Prženice kao kod bake', 'cover_image' => $this->fakeImage('druga.png')]))
            ->assertSessionHasNoErrors();

        $post->refresh();
        $this->assertSame('przenice-kao-kod-bake', $post->slug);
        Storage::disk('public')->assertMissing($firstCover);
        Storage::disk('public')->assertExists($post->cover_image_path);

        // The address people already shared still works.
        $this->get('/price/przenice-sa-ajvarom')->assertRedirect(url('/price/przenice-kao-kod-bake'));

        $this->put(route('producers.posts.update', [$producer, $post]), $this->submission(['title' => 'Prženice kao kod bake', 'remove_cover' => '1']));
        $this->assertNull($post->refresh()->cover_image_path);

        $this->delete(route('producers.posts.destroy', [$producer, $post]))->assertRedirect();
        $this->assertDatabaseCount('posts', 0);
    }

    public function test_an_admin_takes_a_post_down_and_only_an_admin_puts_it_back(): void
    {
        $producer = Producer::factory()->active()->create();
        $post = $this->makePost($producer);
        $draft = $this->makePost($producer, ['status' => 'draft']);

        $this->actingAs($producer->user)->get(route('admin.posts.index'))->assertForbidden();
        $this->actingAs($producer->user)->patch(route('admin.posts.status', $post), ['status' => 'blocked'])->assertForbidden();

        $this->actingAs($this->admin)->get(route('admin.posts.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('admin/posts/index')->where('posts.total', 2));
        $this->actingAs($this->admin)->get(route('admin.posts.index', ['status' => 'draft', 'q' => 'sir']))
            ->assertInertia(fn ($page) => $page->where('posts.total', 1));

        $this->actingAs($this->admin)->patch(route('admin.posts.status', $post), ['status' => 'blocked'])->assertRedirect();
        $this->assertSame(Post::STATUS_BLOCKED, $post->refresh()->status);
        $this->assertContains('post.blocked', $producer->user->notifications()->get()->pluck('data.type')->all());

        // "Put back" is not a way to publish someone's draft for them.
        $this->actingAs($this->admin)->patch(route('admin.posts.status', $draft), ['status' => 'published'])->assertStatus(422);

        // The author can correct it, but it stays down.
        $this->actingAs($producer->user)
            ->put(route('producers.posts.update', [$producer, $post]), $this->submission(['type' => 'story', 'status' => 'published']))
            ->assertSessionHasErrors('status');
        $this->actingAs($producer->user)
            ->put(route('producers.posts.update', [$producer, $post]), $this->submission(['type' => 'story', 'title' => 'Ispravljeno', 'status' => 'blocked']))
            ->assertSessionHasNoErrors();
        $this->assertSame(Post::STATUS_BLOCKED, $post->refresh()->status);

        $this->app['auth']->forgetGuards();
        $this->get(route('marketplace.posts.show', $post->slug))->assertNotFound();

        $this->actingAs($this->admin)->patch(route('admin.posts.status', $post), ['status' => 'published']);
        $this->app['auth']->forgetGuards();
        $this->get(route('marketplace.posts.show', $post->slug))->assertOk();

        $this->actingAs($this->admin)->delete(route('admin.posts.destroy', $post))->assertRedirect();
        $this->assertDatabaseMissing('posts', ['id' => $post->id]);
    }

    public function test_a_reader_can_report_a_published_post_and_the_admin_sees_what_it_is(): void
    {
        $producer = Producer::factory()->active()->create();
        $post = $this->makePost($producer, ['title' => 'Čudotvorni lek']);
        $draft = $this->makePost($producer, ['status' => 'draft']);
        $reader = User::factory()->create();

        $this->actingAs($reader)->get(route('marketplace.posts.show', $post->slug))
            ->assertInertia(fn ($page) => $page->where('canReport', true)->has('reportReasons.neprimereno'));
        // Nobody reports their own post, and a guest has to sign in first.
        $this->actingAs($producer->user)->get(route('marketplace.posts.show', $post->slug))
            ->assertInertia(fn ($page) => $page->where('canReport', false));

        $this->actingAs($reader)->post(route('reports.store'), [
            'reportable_type' => 'post', 'reportable_id' => $post->id, 'reason' => 'neprimereno',
        ])->assertRedirect();

        $this->assertTrue(Report::sole()->reportable->is($post));

        // A draft has an id, but nobody outside can see it to complain about it.
        $this->actingAs($reader)->post(route('reports.store'), [
            'reportable_type' => 'post', 'reportable_id' => $draft->id, 'reason' => 'neprimereno',
        ])->assertNotFound();

        $this->actingAs($this->admin)->get(route('admin.reports.index'))->assertInertia(fn ($page) => $page
            ->where('reports.data.0.subject.name', 'Čudotvorni lek')
            ->where('reports.data.0.subject.url', route('marketplace.posts.show', $post->slug)));
    }

    public function test_the_list_has_a_ceiling(): void
    {
        $producer = Producer::factory()->active()->create();
        $rows = collect(range(1, Post::MAX_PER_PRODUCER))->map(fn (int $number) => [
            'producer_id' => $producer->id, 'type' => 'story', 'title' => "Priča {$number}", 'slug' => "prica-{$number}",
            'body' => 'Tekst', 'status' => 'draft', 'created_at' => now(), 'updated_at' => now(),
        ]);
        Post::insert($rows->all());

        $this->actingAs($producer->user)
            ->post(route('producers.posts.store', $producer), $this->submission())
            ->assertSessionHasErrors('title');
    }
}
