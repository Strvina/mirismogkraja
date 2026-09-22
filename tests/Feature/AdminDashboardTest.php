<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\RolesSeeder;
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
        ProducerMessage::create(['household_id' => $producer->id, 'buyer_id' => $admin->id, 'sender_id' => $admin->id, 'body' => 'Pitanje']);
        ProducerMessage::create(['household_id' => $producer->id, 'buyer_id' => $admin->id, 'sender_id' => $seller->id, 'body' => 'Odgovor']);
        ProducerMessage::create(['household_id' => $producer->id, 'buyer_id' => $otherBuyer->id, 'sender_id' => $otherBuyer->id, 'body' => 'Drugo pitanje']);

        $response = $this->actingAs($admin)->get(route('admin.dashboard'));

        $response->assertInertia(fn ($page) => $page->where('stats.producers', 3)
            ->where('stats.products', 4)
            ->where('stats.conversations', 2)
            ->where('stats.messages', 3));
    }
}
