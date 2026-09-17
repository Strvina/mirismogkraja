<?php

namespace Tests\Feature;

use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_category_can_have_a_parent()
    {
        $parent = Category::factory()->create(['name' => 'Zimnica']);
        $child = Category::factory()->create(['name' => 'Ajvar', 'parent_id' => $parent->id]);

        $this->assertTrue($child->parent->is($parent));
    }

    public function test_category_can_have_many_children()
    {
        $parent = Category::factory()->create();
        Category::factory()->count(2)->create(['parent_id' => $parent->id]);

        $this->assertCount(2, $parent->children);
    }

    public function test_top_level_category_has_no_parent()
    {
        $category = Category::factory()->create();

        $this->assertNull($category->parent_id);
        $this->assertNull($category->parent);
    }
}
