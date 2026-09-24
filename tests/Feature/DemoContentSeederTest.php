<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Database\Seeders\CategoriesSeeder;
use Database\Seeders\DemoContentSeeder;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoContentSeederTest extends TestCase
{
    use RefreshDatabase;

    private function seedDemoContent(): void
    {
        $this->seed(RolesSeeder::class);
        $this->seed(CategoriesSeeder::class);
        $this->seed(DemoContentSeeder::class);
    }

    /**
     * Guards task 1: after seeding, every screen (producers, catalog,
     * conversations, reviews) has real data.
     */
    public function test_seeder_populates_a_realistic_demo_dataset(): void
    {
        $this->seedDemoContent();

        $this->assertTrue(User::where('email', 'admin@gmail.com')->first()?->hasRole('admin'));

        $this->assertSame(6, Producer::count());
        $this->assertSame(6, Producer::where('status', 'active')->count());

        $this->assertGreaterThan(0, Product::where('status', 'active')->count());
        $this->assertGreaterThan(0, Product::where('status', 'active')->where('stock_quantity', 0)->count());
        $this->assertGreaterThan(0, Product::where('status', 'draft')->count());
        $this->assertGreaterThan(0, Product::whereHas('images')->count());

        $this->assertGreaterThan(0, Review::count());
        $this->assertGreaterThan(1, Review::pluck('rating')->unique()->count());

        $this->assertGreaterThan(0, User::role('buyer')->count());
        $this->assertGreaterThan(0, User::role('seller')->count());
    }

    public function test_seeded_conversations_cover_answered_and_waiting_threads(): void
    {
        $this->seedDemoContent();

        $producerIds = Producer::pluck('user_id');

        $this->assertGreaterThan(0, ProducerMessage::whereIn('sender_id', $producerIds)->count(), 'expected answered threads');
        $this->assertGreaterThan(0, ProducerMessage::whereNull('read_at')->count(), 'expected unread messages');
        $this->assertGreaterThan(0, ProducerMessage::whereNotNull('product_id')->count(), 'expected inquiries opened from a product page');
    }

    /**
     * Every seeded review has to be one its author would actually be allowed
     * to leave, otherwise the demo data contradicts ReviewPolicy.
     */
    public function test_every_seeded_review_is_one_the_policy_would_permit(): void
    {
        $this->seedDemoContent();

        foreach (Review::with('user')->get() as $review) {
            $producer = Producer::findOrFail($review->household_id);

            $this->assertTrue(
                ProducerMessage::query()
                    ->where('household_id', $producer->id)
                    ->where('buyer_id', $review->user_id)
                    ->where('sender_id', $producer->user_id)
                    ->exists(),
                "review by user {$review->user_id} has no reply from producer {$producer->id}"
            );
        }
    }

    public function test_seeder_can_be_run_twice_without_duplicate_demo_users(): void
    {
        $this->seedDemoContent();

        $usersAfterFirstRun = User::count();
        $producersAfterFirstRun = Producer::count();

        $this->seed(DemoContentSeeder::class);

        $this->assertSame($usersAfterFirstRun, User::count());
        $this->assertSame($producersAfterFirstRun, Producer::count());
        $this->assertSame(1, User::where('email', 'nicic@example.com')->count());
    }
}
