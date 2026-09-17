<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminProductManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access()
    {
        $this->seed(RolesSeeder::class);
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('admin.products.index'))->assertForbidden();
    }

    public function test_admin_can_delete_any_product()
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $product = Product::factory()->create();

        $this->actingAs($admin)->delete(route('admin.products.destroy', $product));

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }
}
