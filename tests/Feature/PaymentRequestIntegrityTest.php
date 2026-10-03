<?php

namespace Tests\Feature;

use App\Models\Boost;
use App\Models\Producer;
use App\Models\ProducerSubscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\SubscriptionService;
use Database\Seeders\RolesSeeder;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A payment slip, once handed out, stays valid: its reference may already
 * be on a transfer on its way. And the admins hear about each thing once.
 */
class PaymentRequestIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([RolesSeeder::class, SubscriptionPlansSeeder::class]);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
    }

    public function test_asking_to_boost_again_hands_back_the_same_slip(): void
    {
        $producer = Producer::factory()->active()->create();

        $this->actingAs($producer->user)->post(route('boosts.store'), ['kind' => 'profile', 'producer_id' => $producer->id]);
        $first = Boost::sole();

        $this->actingAs($producer->user)
            ->post(route('boosts.store'), ['kind' => 'profile', 'producer_id' => $producer->id])
            ->assertRedirect(route('boosts.index', ['uplatnica' => $first->id]));

        $this->assertSame($first->reference, Boost::sole()->reference);
        $this->assertSame(1, $this->admin->notifications()->count());
    }

    public function test_the_same_plan_again_keeps_the_slip_and_another_plan_replaces_it(): void
    {
        $producer = Producer::factory()->active()->create();
        $subscriptions = app(SubscriptionService::class);
        $premium = SubscriptionPlan::where('slug', 'premium')->sole();

        $first = $subscriptions->request($producer, $premium);
        $this->assertTrue($first->is($subscriptions->request($producer, $premium)));

        $pro = $subscriptions->request($producer, SubscriptionPlan::where('slug', 'pro')->sole());
        $this->assertSame([$pro->id], ProducerSubscription::where('status', ProducerSubscription::STATUS_PENDING)->pluck('id')->all());
    }

    public function test_a_phone_number_is_digits_and_separators(): void
    {
        $user = User::factory()->create();

        foreach (['+381 64 123 4567', '011/123-456', '064.123.456'] as $phone) {
            $this->actingAs($user)->patch(route('profile.update'), ['name' => $user->name, 'email' => $user->email, 'phone' => $phone])
                ->assertSessionHasNoErrors();
        }

        $this->actingAs($user)->patch(route('profile.update'), ['name' => $user->name, 'email' => $user->email, 'phone' => 'javascript:alert(1)'])
            ->assertSessionHasErrors('phone');
    }

    /** Checking a password is limited like the login form. */
    public function test_password_checks_are_rate_limited(): void
    {
        $user = User::factory()->create();

        foreach (range(1, 6) as $attempt) {
            $this->actingAs($user)->put(route('password.update'), ['current_password' => 'wrong', 'password' => 'new-password-1', 'password_confirmation' => 'new-password-1']);
        }

        $this->actingAs($user)
            ->put(route('password.update'), ['current_password' => 'wrong', 'password' => 'new-password-1', 'password_confirmation' => 'new-password-1'])
            ->assertStatus(429);
    }
}
