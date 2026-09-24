<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use App\Services\FoundingProducerService;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tasks 20.4 and 20.5 - the two parts of the monetisation plan that involve
 * no money: the founding hundred, and following a producer.
 */
class FoundingAndFollowTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        return $admin;
    }

    private function approve(User $admin, Producer $producer): void
    {
        $this->actingAs($admin)->patch(route('admin.producers.status', $producer), ['status' => 'active']);
    }

    public function test_numbers_are_handed_out_on_approval_in_order(): void
    {
        $admin = $this->admin();
        $first = Producer::factory()->create(['status' => 'pending']);
        $second = Producer::factory()->create(['status' => 'pending']);

        $this->approve($admin, $second);
        $this->approve($admin, $first);

        // Approval order, not creation order.
        $this->assertSame(1, $second->refresh()->founding_number);
        $this->assertSame(2, $first->refresh()->founding_number);
        $this->assertNotNull($second->founding_joined_at);
    }

    /** A request that is never approved must not use up a place. */
    public function test_a_producer_that_is_never_approved_takes_no_place(): void
    {
        $admin = $this->admin();
        Producer::factory()->create(['status' => 'pending']);
        $approved = Producer::factory()->create(['status' => 'pending']);

        $this->approve($admin, $approved);

        $this->assertSame(1, $approved->refresh()->founding_number);
        $this->assertSame(1, app(FoundingProducerService::class)->claimed());
    }

    /** The number is permanent: re-approving does not move it. */
    public function test_the_number_is_kept_through_later_status_changes(): void
    {
        $admin = $this->admin();
        $producer = Producer::factory()->create(['status' => 'pending']);

        $this->approve($admin, $producer);
        $number = $producer->refresh()->founding_number;

        $this->actingAs($admin)->patch(route('admin.producers.status', $producer), ['status' => 'blocked']);
        $this->approve($admin, $producer);

        $this->assertSame($number, $producer->refresh()->founding_number);
    }

    public function test_no_places_are_handed_out_past_the_hundred(): void
    {
        $admin = $this->admin();

        // Standing in for the first hundred without creating a hundred rows.
        Producer::factory()->active()->create(['founding_number' => FoundingProducerService::LIMIT]);

        $late = Producer::factory()->create(['status' => 'pending']);
        $this->approve($admin, $late);

        $this->assertNull($late->refresh()->founding_number);
        $this->assertSame(0, app(FoundingProducerService::class)->remaining());
    }

    public function test_the_public_roll_lists_them_in_order(): void
    {
        Producer::factory()->active()->create(['founding_number' => 2, 'name' => 'Drugi']);
        Producer::factory()->active()->create(['founding_number' => 1, 'name' => 'Prvi']);
        Producer::factory()->active()->create(['name' => 'Bez broja']);

        $this->get(route('marketplace.founding'))->assertOk()->assertInertia(
            fn ($page) => $page->component('marketplace/founding')
                ->has('producers', 2)
                ->where('producers.0.name', 'Prvi')
                ->where('producers.1.name', 'Drugi')
                ->where('claimed', 2)
        );
    }

    public function test_following_a_producer_is_a_toggle(): void
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->active()->create();

        $this->actingAs($user)->post(route('producers.follow', $producer))->assertRedirect();
        $this->assertTrue($producer->followers()->whereKey($user->id)->exists());

        $this->actingAs($user)->post(route('producers.follow', $producer));
        $this->assertFalse($producer->followers()->whereKey($user->id)->exists());
    }

    public function test_an_owner_cannot_follow_their_own_producer(): void
    {
        $producer = Producer::factory()->active()->create();

        $this->actingAs($producer->user)->post(route('producers.follow', $producer))->assertForbidden();
    }

    public function test_followers_are_told_about_a_new_published_product(): void
    {
        $follower = User::factory()->create();
        $producer = Producer::factory()->active()->create(['name' => 'Mlekara Zapis']);
        $this->actingAs($follower)->post(route('producers.follow', $producer));

        $this->actingAs($producer->user)->post(route('producers.products.store', $producer), [
            'category_id' => Category::factory()->create()->id,
            'name' => 'Mladi sir',
            'description' => 'Od jutrošnjeg mleka',
            'price' => 600,
            'unit' => 'kg',
            'stock_quantity' => 10,
            'status' => 'active',
        ]);

        $notification = $follower->notifications()->sole();
        $this->assertSame('product.published', $notification->data['type']);
        $this->assertStringContainsString('Mladi sir', $notification->data['body']);
    }

    /** A draft is nobody's news. */
    public function test_a_draft_product_tells_nobody(): void
    {
        $follower = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $this->actingAs($follower)->post(route('producers.follow', $producer));

        $this->actingAs($producer->user)->post(route('producers.products.store', $producer), [
            'category_id' => Category::factory()->create()->id,
            'name' => 'Još nije spremno',
            'price' => 100,
            'unit' => 'kom',
            'stock_quantity' => 1,
            'status' => 'draft',
        ]);

        $this->assertSame(1, Product::count());
        $this->assertSame(0, $follower->notifications()->count());
    }
}
