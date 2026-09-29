<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\SubscriptionService;
use Database\Seeders\RolesSeeder;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * What a paid plan actually buys (task 20.1): the badge, the featured row in
 * the directory, and - on the top plan - the homepage. Paid producers get
 * labelled slots of their own; the ordinary listing is never reordered.
 */
class PlanBenefitsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SubscriptionPlansSeeder::class);
    }

    private function member(string $plan, array $attributes = []): Producer
    {
        $producer = Producer::factory()->active()->create($attributes);
        $service = app(SubscriptionService::class);

        $service->confirmPayment(
            $service->request($producer, SubscriptionPlan::where('slug', $plan)->sole()),
            User::factory()->create()->id,
        );

        return $producer;
    }

    public function test_a_premium_producer_is_badged_and_featured_in_the_directory(): void
    {
        $premium = $this->member('premium', ['name' => 'Zlatna košnica']);
        $plain = Producer::factory()->active()->create(['name' => 'Ajvar kod Mile']);

        $this->get(route('marketplace.producers.index'))->assertInertia(fn ($page) => $page
            ->has('featured', 1)
            ->where('featured.0.id', $premium->id)
            ->where('featured.0.is_premium', true)
            // The directory itself stays alphabetical, paid or not.
            ->where('producers.data.0.id', $plain->id)
            ->where('producers.data.0.is_premium', false)
            ->where('producers.data.1.is_premium', true));

        $this->get(route('marketplace.producers.show', $premium->slug))
            ->assertInertia(fn ($page) => $page->where('isPremium', true));
        $this->get(route('marketplace.producers.show', $plain->slug))
            ->assertInertia(fn ($page) => $page->where('isPremium', false));
    }

    public function test_the_basic_plan_buys_no_placement(): void
    {
        $this->member('basic');

        $this->get(route('marketplace.producers.index'))
            ->assertInertia(fn ($page) => $page->has('featured', 0)->where('producers.data.0.is_premium', false));
    }

    public function test_an_expired_membership_loses_its_benefits(): void
    {
        $producer = $this->member('premium');
        $producer->subscriptions()->update(['ends_at' => now()->subDay()]);

        $this->get(route('marketplace.producers.index'))->assertInertia(fn ($page) => $page->has('featured', 0));
        $this->get(route('marketplace.producers.show', $producer->slug))
            ->assertInertia(fn ($page) => $page->where('isPremium', false));
    }

    public function test_the_featured_row_follows_the_city_filter_and_only_opens_the_first_page(): void
    {
        $this->member('premium', ['city' => 'Niš']);
        Producer::factory()->active()->count(12)->create(['city' => 'Leskovac']);

        $this->get(route('marketplace.producers.index', ['city' => 'Leskovac']))
            ->assertInertia(fn ($page) => $page->has('featured', 0));
        $this->get(route('marketplace.producers.index', ['page' => 2]))
            ->assertInertia(fn ($page) => $page->has('featured', 0));
    }

    /** Pro buys priority support, so the admin list says who is on what. */
    public function test_the_admin_list_shows_each_producers_plan(): void
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $pro = $this->member('pro');

        $this->actingAs($admin)->get(route('admin.producers.index'))->assertInertia(fn ($page) => $page
            ->where('producers.data.0.id', $pro->id)
            ->where('producers.data.0.current_membership.plan.name', 'Pro'));
    }

    public function test_only_the_top_plan_reaches_the_homepage(): void
    {
        $pro = $this->member('pro');
        $this->member('premium');

        $this->get('/')->assertInertia(fn ($page) => $page
            ->has('featuredProducers', 1)
            ->where('featuredProducers.0.id', $pro->id)
            ->where('featuredProducers.0.is_premium', true));
    }
}
