<?php

namespace Tests\Feature;

use App\Models\Category;
use Database\Seeders\CategoriesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoriesSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_the_nine_base_categories()
    {
        $this->seed(CategoriesSeeder::class);

        $this->assertSame(9, Category::count());
        $this->assertDatabaseHas('categories', ['name' => 'Voće']);
        $this->assertDatabaseHas('categories', ['name' => 'Med i pčelinji proizvodi']);
        $this->assertDatabaseHas('categories', ['name' => 'Ostalo']);
    }

    public function test_it_is_idempotent()
    {
        $this->seed(CategoriesSeeder::class);
        $this->seed(CategoriesSeeder::class);

        $this->assertSame(9, Category::count());
    }
}
