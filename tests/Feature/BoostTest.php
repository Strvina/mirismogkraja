<?php

namespace Tests\Feature;

use App\Models\Boost;
use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use App\Services\BoostService;
use App\Services\PaymentSlipService;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Paid boosts (task 20.2): asked for by the producer, paid by slip,
 * confirmed by an admin, shown in the labelled row for their days.
 */
class BoostTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        return $admin;
    }

    private function ask(Producer $producer, string $kind, ?Product $product = null): Boost
    {
        $this->actingAs($producer->user)->post(route('boosts.store'), [
            'kind' => $kind,
            'producer_id' => $producer->id,
            'product_id' => $product?->id,
        ])->assertSessionHasNoErrors();

        return Boost::latest('id')->firstOrFail();
    }

    public function test_asking_for_a_boost_hands_back_a_slip_and_waits_for_the_money(): void
    {
        $producer = Producer::factory()->active()->create(['name' => 'Mlekara Zapis']);

        $boost = $this->ask($producer, 'profile');

        $this->assertSame(Boost::STATUS_PENDING, $boost->status);
        $this->assertSame(1000, $boost->amount_rsd);
        $this->assertSame(7, $boost->days);
        $this->assertMatchesRegularExpression('/^\d{2}-\d{8}$/', $boost->reference);
        $this->assertSame('Isticanje profila na sajtu Vrelina juga - Mlekara Zapis', app(PaymentSlipService::class)->detailsFor($boost)['purpose']);

        // A product boost says so, so two slips from one producer differ.
        $product = Product::factory()->for($producer)->create();
        $this->assertStringStartsWith('Isticanje proizvoda na sajtu', app(PaymentSlipService::class)->detailsFor($this->ask($producer, 'product', $product))['purpose']);

        $this->actingAs($producer->user)->get(route('boosts.index'))
            ->assertInertia(fn ($page) => $page->where('boosts.0.status', 'pending_payment')->has('boosts.0.slip.qr'));

        $pdf = $this->actingAs($producer->user)->get(route('boosts.slip', $boost))->assertOk();
        $this->assertStringStartsWith('%PDF-', $pdf->getContent());
        $this->actingAs(User::factory()->create())->get(route('boosts.slip', $boost))->assertForbidden();

        // Unpaid, it buys nothing yet.
        $this->get(route('marketplace.producers.index'))->assertInertia(fn ($page) => $page->has('featured', 0));
    }

    /** Only something the public can open, and only your own. */
    public function test_only_your_own_published_things_can_be_boosted(): void
    {
        $pending = Producer::factory()->create(['status' => 'pending']);
        $this->actingAs($pending->user)
            ->post(route('boosts.store'), ['kind' => 'profile', 'producer_id' => $pending->id])
            ->assertNotFound();

        $someoneElses = Producer::factory()->active()->create();
        $this->actingAs(User::factory()->create())
            ->post(route('boosts.store'), ['kind' => 'profile', 'producer_id' => $someoneElses->id])
            ->assertForbidden();

        $draft = Product::factory()->for($someoneElses)->create(['status' => 'draft']);
        $this->actingAs($someoneElses->user)
            ->post(route('boosts.store'), ['kind' => 'product', 'producer_id' => $someoneElses->id, 'product_id' => $draft->id])
            ->assertNotFound();

        $this->assertSame(0, Boost::count());
    }

    public function test_a_confirmed_profile_boost_joins_the_featured_row_for_its_days(): void
    {
        $producer = Producer::factory()->active()->create(['city' => 'Niš']);
        $boost = $this->ask($producer, 'profile');

        $this->actingAs($this->admin())->patch(route('admin.boosts.confirm', $boost))->assertRedirect();

        $boost->refresh();
        $this->assertSame(Boost::STATUS_ACTIVE, $boost->status);
        $this->assertTrue($boost->ends_at->between(now()->addDays(7)->subMinute(), now()->addDays(7)->addMinute()));
        $this->assertSame('boost.activated', $producer->user->notifications()->sole()->data['type']);

        $this->get(route('marketplace.producers.index'))->assertInertia(fn ($page) => $page->where('featured.0.id', $producer->id));
        // Regional: it shows in its own city, not in another.
        $this->get(route('marketplace.producers.index', ['city' => 'Niš']))->assertInertia(fn ($page) => $page->has('featured', 1));
        $this->get(route('marketplace.producers.index', ['city' => 'Pirot']))->assertInertia(fn ($page) => $page->has('featured', 0));

        $this->travel(8)->days();
        $this->get(route('marketplace.producers.index'))->assertInertia(fn ($page) => $page->has('featured', 0));

        $this->artisan('memberships:process-expiries')->assertSuccessful();
        $this->assertSame(Boost::STATUS_EXPIRED, $boost->refresh()->status);
    }

    public function test_a_product_boost_shows_above_the_catalog_within_the_filters(): void
    {
        $honey = Category::factory()->create();
        $cheese = Category::factory()->create();
        $producer = Producer::factory()->active()->create();
        $product = Product::factory()->for($producer)->create(['category_id' => $honey->id]);

        $boost = $this->ask($producer, 'product', $product);
        $this->actingAs($this->admin())->patch(route('admin.boosts.confirm', $boost));

        $this->get(route('marketplace.products.index'))
            ->assertInertia(fn ($page) => $page->where('featured.0.id', $product->id));
        $this->get(route('marketplace.products.index', ['category_id' => $honey->id]))
            ->assertInertia(fn ($page) => $page->has('featured', 1));
        $this->get(route('marketplace.products.index', ['category_id' => $cheese->id]))
            ->assertInertia(fn ($page) => $page->has('featured', 0));
    }

    /** Buying another week while one runs adds a week, it does not overlap. */
    public function test_a_second_boost_starts_where_the_first_ends(): void
    {
        $producer = Producer::factory()->active()->create();
        $admin = $this->admin();

        $first = $this->ask($producer, 'profile');
        $this->actingAs($admin)->patch(route('admin.boosts.confirm', $first));
        $second = $this->ask($producer, 'profile');
        $this->actingAs($admin)->patch(route('admin.boosts.confirm', $second));

        $this->assertTrue($second->refresh()->starts_at->equalTo($first->refresh()->ends_at));
    }

    public function test_new_prices_apply_to_new_requests_only(): void
    {
        $producer = Producer::factory()->active()->create();
        $asked = $this->ask($producer, 'profile');

        $this->actingAs($this->admin())
            ->put(route('admin.boosts.terms'), ['profile_price' => 1500, 'product_price' => 900, 'days' => 10])
            ->assertSessionHasNoErrors();

        $this->assertSame(['profile_price' => 1500, 'product_price' => 900, 'days' => 10], app(BoostService::class)->terms());
        $this->assertSame(1000, $asked->refresh()->amount_rsd);
    }

    public function test_only_an_admin_confirms(): void
    {
        $producer = Producer::factory()->active()->create();
        $boost = $this->ask($producer, 'profile');

        $this->actingAs($producer->user)->patch(route('admin.boosts.confirm', $boost))->assertForbidden();
        $this->assertSame(Boost::STATUS_PENDING, $boost->refresh()->status);
    }
}
