<?php

namespace Tests\Feature;

use App\Models\Category;
use Database\Seeders\CategoriesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryBannerTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_category_page_and_its_subcategories_show_the_familys_photo()
    {
        $honey = Category::factory()->create(['name' => 'Med i pčelinji proizvodi', 'slug' => 'med-i-pcelinji-proizvodi']);
        $acacia = Category::factory()->create(['name' => 'Bagremov med', 'slug' => 'bagremov-med', 'parent_id' => $honey->id]);

        $this->get(route('marketplace.categories.show', $honey->slug))
            ->assertInertia(fn ($page) => $page->where('banner', ['src' => '/images/categories/med-i-pcelinji-proizvodi.webp', 'alt' => 'Med i pčelinji proizvodi']));

        $this->get(route('marketplace.categories.show', $acacia->slug))
            ->assertInertia(fn ($page) => $page->where('banner.src', '/images/categories/med-i-pcelinji-proizvodi.webp')->where('banner.alt', 'Bagremov med'));
    }

    public function test_choosing_a_category_in_the_filter_shows_its_photo_too()
    {
        $honey = Category::factory()->create(['name' => 'Med i pčelinji proizvodi', 'slug' => 'med-i-pcelinji-proizvodi']);

        $this->get(route('marketplace.products.index', ['category_id' => $honey->id]))
            ->assertInertia(fn ($page) => $page->where('banner.src', '/images/categories/med-i-pcelinji-proizvodi.webp'));

        $this->get(route('marketplace.products.index'))->assertInertia(fn ($page) => $page->where('banner', null));
    }

    public function test_a_category_without_a_photo_shows_none()
    {
        $new = Category::factory()->create(['name' => 'Pečurke', 'slug' => 'pecurke']);

        $this->get(route('marketplace.categories.show', $new->slug))->assertInertia(fn ($page) => $page->where('banner', null));
    }

    public function test_every_top_level_category_has_a_photo()
    {
        $this->seed(CategoriesSeeder::class);

        Category::query()->roots()->get()->each(fn (Category $category) => $this->assertNotNull($category->bannerUrl(), $category->name));
    }
}
