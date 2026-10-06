<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerCertificate;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\ProductAlert;
use App\Models\QuickReply;
use App\Models\Referral;
use App\Models\Review;
use App\Models\User;
use Database\Seeders\CategoriesSeeder;
use Database\Seeders\DemoContentSeeder;
use Database\Seeders\RolesSeeder;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DemoContentSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // The demo certificates' placeholder documents, kept off the real disk.
        Storage::fake(ProducerCertificate::DISK);
    }

    private function seedDemoContent(): void
    {
        $this->seed(RolesSeeder::class);
        $this->seed(CategoriesSeeder::class);
        $this->seed(DemoContentSeeder::class);
    }

    /** Every paid feature has something to show on a fresh install. */
    public function test_seeder_fills_every_paid_feature(): void
    {
        $this->seed([RolesSeeder::class, CategoriesSeeder::class, SubscriptionPlansSeeder::class, DemoContentSeeder::class]);

        $this->get('/')->assertInertia(fn ($page) => $page
            ->has('weeklyPick.producer')
            ->has('campaigns', 1)
            ->has('featuredProducers', 1));
        $this->get(route('marketplace.producers.index'))->assertInertia(fn ($page) => $page->where('featured', fn ($featured) => count($featured) >= 1));
        $this->get(route('marketplace.products.index'))->assertInertia(fn ($page) => $page->has('featured', 1));
        $this->assertSame(3, Producer::whereNotNull('founding_number')->count());
        $this->assertSame(6, Producer::whereNotNull('lat')->count());
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

    /** The screens around a producer's products are not empty either. */
    public function test_seeder_fills_what_producers_add_around_their_products(): void
    {
        $this->seed([RolesSeeder::class, CategoriesSeeder::class, SubscriptionPlansSeeder::class, DemoContentSeeder::class]);

        $apiary = Producer::where('name', 'Pčelinjak Medovina')->sole();

        $this->get(route('marketplace.producers.show', $apiary->slug))->assertInertia(fn ($page) => $page
            ->has('markets', 1)
            ->has('certificates', 1)
            ->has('posts', 1));
        $this->get(route('marketplace.posts.index'))->assertInertia(fn ($page) => $page->where('posts.total', 3));
        $this->get('/')->assertInertia(fn ($page) => $page->has('latestPosts', 3));
        $this->get(route('marketplace.catalog', $apiary->slug))->assertOk();

        $this->assertSame(1, ProducerCertificate::where('status', ProducerCertificate::STATUS_PENDING)->count());
        $this->assertGreaterThan(0, ProductAlert::count());
        $this->assertSame(3, QuickReply::count());
        $this->assertSame(1, Referral::count());

        // Something in season this month, whenever the demo is seeded, and two buyers looking for something.
        $this->get('/')->assertInertia(fn ($page) => $page->has('seasonalProducts'));
        $this->assertGreaterThan(0, Product::published()->seasonal()->count());
        $this->get(route('wanted.index'))->assertInertia(fn ($page) => $page->has('ads.data', 2)->where('ads.data.1.responses_count', 1));
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
            $producer = Producer::findOrFail($review->producer_id);

            $this->assertTrue(
                ProducerMessage::query()
                    ->where('producer_id', $producer->id)
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
