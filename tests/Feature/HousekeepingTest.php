<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HousekeepingTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_product_page_carries_structured_data_for_search_results(): void
    {
        $product = Product::factory()->for(Producer::factory()->active())->create(['price' => 850, 'stock_quantity' => 3]);

        $this->get(route('marketplace.products.show', $product->slug))
            ->assertSee('<script type="application/ld+json">', false)
            ->assertSee('"priceCurrency":"RSD"', false)
            ->assertSee('"price":"850.00"', false)
            ->assertSee('https://schema.org/InStock', false);
    }

    /** A product name is the seller's text; it must not be able to end the script tag. */
    public function test_structured_data_cannot_be_used_to_inject_a_script(): void
    {
        $product = Product::factory()->for(Producer::factory()->active())->create(['name' => 'Med</script><script>alert(1)</script>']);

        $this->get(route('marketplace.products.show', $product->slug))
            ->assertDontSee('<script>alert(1)', false);
    }

    public function test_visitors_are_not_sent_the_admin_routes(): void
    {
        $this->get('/')->assertDontSee('"admin.dashboard"', false)->assertSee('"marketplace.products.index"', false);

        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)->get('/')->assertSee('"admin.dashboard"', false);
    }

    public function test_audit_entries_older_than_a_year_are_pruned(): void
    {
        $old = ActivityLog::create(['user_name' => 'Sistem', 'action' => 'created', 'subject_type' => 'Product', 'subject_id' => 1]);
        $old->forceFill(['created_at' => now()->subMonths(ActivityLog::KEEP_MONTHS)->subDay()])->save();
        $recent = ActivityLog::create(['user_name' => 'Sistem', 'action' => 'created', 'subject_type' => 'Product', 'subject_id' => 2]);

        $this->artisan('model:prune', ['--model' => [ActivityLog::class]])->assertSuccessful();

        $this->assertModelMissing($old);
        $this->assertModelExists($recent);
    }
}
