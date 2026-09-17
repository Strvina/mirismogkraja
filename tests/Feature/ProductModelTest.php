<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Household;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_belongs_to_a_household_and_category()
    {
        $household = Household::factory()->create();
        $category = Category::factory()->create();
        $product = Product::factory()->for($household)->for($category)->create();

        $this->assertTrue($product->household->is($household));
        $this->assertTrue($product->category->is($category));
    }

    public function test_household_and_category_can_have_many_products()
    {
        $household = Household::factory()->create();
        $category = Category::factory()->create();
        Product::factory()->for($household)->for($category)->count(2)->create();

        $this->assertCount(2, $household->products);
        $this->assertCount(2, $category->products);
    }

    public function test_product_defaults_to_draft_status()
    {
        $product = Product::factory()->create(['status' => 'draft']);

        $this->assertSame('draft', $product->status);
    }

    public function test_product_has_many_images_ordered_by_order_column()
    {
        $product = Product::factory()->create();
        ProductImage::factory()->for($product)->create(['order' => 1, 'path' => 'second.jpg']);
        ProductImage::factory()->for($product)->create(['order' => 0, 'path' => 'first.jpg']);

        $this->assertSame(['first.jpg', 'second.jpg'], $product->images->pluck('path')->toArray());
    }
}
