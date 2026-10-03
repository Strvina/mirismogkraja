<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\BoostService;
use App\Services\SubscriptionService;
use Database\Seeders\RolesSeeder;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_counts_producers_products_and_conversations()
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        User::factory()->count(2)->create();
        $seller = User::factory()->create();
        $producer = Producer::factory()->for($seller)->create();
        Producer::factory()->for($seller)->count(2)->create();
        Product::factory()->for($producer)->count(4)->create();
        $otherBuyer = User::factory()->create();

        // Two messages in one thread, plus a second thread: three messages,
        // two conversations. A count that simply totals the rows would read
        // three here and go unnoticed.
        ProducerMessage::create(['producer_id' => $producer->id, 'buyer_id' => $admin->id, 'sender_id' => $admin->id, 'body' => 'Pitanje']);
        ProducerMessage::create(['producer_id' => $producer->id, 'buyer_id' => $admin->id, 'sender_id' => $seller->id, 'body' => 'Odgovor']);
        ProducerMessage::create(['producer_id' => $producer->id, 'buyer_id' => $otherBuyer->id, 'sender_id' => $otherBuyer->id, 'body' => 'Drugo pitanje']);

        $response = $this->actingAs($admin)->get(route('admin.dashboard'));

        $response->assertInertia(fn ($page) => $page->where('stats.producers', 3)
            ->where('stats.products', 4)
            ->where('stats.conversations', 2)
            ->where('stats.messages', 3));
    }

    /**
     * What waits on the admin, and what the platform has earned by source -
     * confirmed money only, and never a free founding year.
     */
    public function test_dashboard_lists_what_waits_and_what_was_earned()
    {
        $this->seed([RolesSeeder::class, SubscriptionPlansSeeder::class]);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        Producer::factory()->count(2)->create(['status' => 'pending']);
        $producer = Producer::factory()->active()->create();
        $subscriptions = app(SubscriptionService::class);
        $subscriptions->confirmPayment($subscriptions->request($producer, SubscriptionPlan::where('slug', 'premium')->sole()), $admin->id);
        $subscriptions->grant(Producer::factory()->active()->create(), SubscriptionPlan::where('slug', 'premium')->sole());
        $boosts = app(BoostService::class);
        $boosts->confirm($boosts->request($producer, $producer), $admin->id);
        $boosts->request($producer, $producer);

        $this->actingAs($admin)->get(route('admin.dashboard'))->assertInertia(fn ($page) => $page
            ->where('todo.0.count', 2)
            ->where('todo.2.count', 1)
            ->where('revenue.0.total', 5990)
            ->where('revenue.0.month', 5990)
            ->where('revenue.1.total', 1000)
            ->where('revenue.2.total', 0));
    }
}
