<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminPanelTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
    }

    public function test_writes_are_written_to_the_audit_log(): void
    {
        $producer = Producer::factory()->create(['name' => 'Staro ime']);

        $this->actingAs($this->admin)->put(route('admin.producers.update', $producer), ['name' => 'Novo ime']);

        $log = ActivityLog::where('action', 'updated')->where('subject_type', 'Producer')->sole();
        $this->assertSame($this->admin->name, $log->user_name);
        $this->assertSame('Novo ime', $log->subject_label);
        $this->assertSame(['from' => 'Staro ime', 'to' => 'Novo ime'], $log->changes['name']);
    }

    public function test_the_log_entry_outlives_the_record_it_describes(): void
    {
        $product = Product::factory()->create(['name' => 'Ajvar']);

        $this->actingAs($this->admin)->delete(route('admin.products.destroy', $product));

        $log = ActivityLog::where('action', 'deleted')->sole();
        $this->assertSame('Ajvar', $log->subject_label);
        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }

    public function test_products_can_be_deleted_in_bulk(): void
    {
        $products = Product::factory(3)->create();
        $survivor = Product::factory()->create();

        $this->actingAs($this->admin)->post(route('admin.products.bulk'), [
            'action' => 'delete',
            'ids' => $products->pluck('id')->all(),
        ])->assertRedirect();

        $this->assertSame(1, Product::count());
        $this->assertTrue(Product::whereKey($survivor->id)->exists());
        $this->assertSame(3, ActivityLog::where('action', 'deleted')->count());
    }

    public function test_products_can_be_moved_to_another_status_or_category_in_bulk(): void
    {
        $products = Product::factory(2)->create(['status' => 'draft']);
        $category = Category::factory()->create();

        $this->actingAs($this->admin)->post(route('admin.products.bulk'), [
            'action' => 'status',
            'ids' => $products->pluck('id')->all(),
            'status' => 'active',
        ]);

        $this->actingAs($this->admin)->post(route('admin.products.bulk'), [
            'action' => 'category',
            'ids' => $products->pluck('id')->all(),
            'category_id' => $category->id,
        ]);

        $this->assertSame(2, Product::where('status', 'active')->where('category_id', $category->id)->count());
    }

    public function test_bulk_status_requires_a_status(): void
    {
        $product = Product::factory()->create(['status' => 'draft']);

        $this->actingAs($this->admin)->post(route('admin.products.bulk'), [
            'action' => 'status',
            'ids' => [$product->id],
        ])->assertSessionHasErrors('status');

        $this->assertSame('draft', $product->refresh()->status);
    }

    public function test_an_admin_can_approve_a_pending_producer(): void
    {
        $producer = Producer::factory()->create(['status' => 'pending']);

        $this->actingAs($this->admin)->patch(route('admin.producers.status', $producer), ['status' => 'active']);

        $this->assertSame('active', $producer->refresh()->status);
    }

    public function test_the_admin_sections_are_closed_to_everyone_else(): void
    {
        $user = User::factory()->create();

        foreach (['admin.logs.index', 'admin.inquiries.index', 'admin.products.index'] as $name) {
            $this->actingAs($user)->get(route($name))->assertForbidden();
        }
    }
}
