<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminCategoryManagementTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        return $admin;
    }

    public function test_non_admin_cannot_access()
    {
        $this->seed(RolesSeeder::class);
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('admin.categories.index'))->assertForbidden();
    }

    public function test_admin_can_create_a_category()
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.categories.store'), ['name' => 'Voće']);

        $this->assertDatabaseHas('categories', ['name' => 'Voće', 'slug' => 'voce']);
    }

    public function test_admin_can_create_a_subcategory()
    {
        $admin = $this->admin();
        $parent = Category::factory()->create();

        $this->actingAs($admin)->post(route('admin.categories.store'), ['name' => 'Jabuke', 'parent_id' => $parent->id]);

        $this->assertDatabaseHas('categories', ['name' => 'Jabuke', 'parent_id' => $parent->id]);
    }

    public function test_category_cannot_be_its_own_parent()
    {
        $admin = $this->admin();
        $category = Category::factory()->create();

        $this->actingAs($admin)->put(route('admin.categories.update', $category), [
            'name' => $category->name,
            'parent_id' => $category->id,
        ])->assertSessionHasErrors('parent_id');
    }

    public function test_deleting_a_parent_orphans_its_children_instead_of_cascading()
    {
        $admin = $this->admin();
        $parent = Category::factory()->create();
        $child = Category::factory()->create(['parent_id' => $parent->id]);

        $this->actingAs($admin)->delete(route('admin.categories.destroy', $parent));

        $this->assertDatabaseMissing('categories', ['id' => $parent->id]);
        $this->assertDatabaseHas('categories', ['id' => $child->id, 'parent_id' => null]);
    }
}
