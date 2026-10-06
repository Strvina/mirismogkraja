<?php

namespace Tests\Feature;

use App\Models\Category;
use Database\Seeders\CategoriesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoriesSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_the_categories_and_their_subcategories()
    {
        $this->seed(CategoriesSeeder::class);

        $this->assertSame(12, Category::roots()->count());
        $this->assertDatabaseHas('categories', ['name' => 'Voće', 'search_name' => 'Domaće voće']);
        $this->assertDatabaseHas('categories', ['name' => 'Med i pčelinji proizvodi']);
        $this->assertDatabaseHas('categories', ['name' => 'Ostalo', 'search_name' => null]);

        // The products people search for by name, each with an address of its own.
        $preserves = Category::where('slug', 'zimnica')->sole();
        $this->assertSame(['Ajvar', 'Ljutenica', 'Pinđur', 'Sušena paprika', 'Turšija'], $preserves->children()->orderBy('name')->pluck('name')->all());
        $this->assertDatabaseHas('categories', ['slug' => 'ajvar', 'search_name' => 'Domaći ajvar', 'parent_id' => $preserves->id]);

        // Two levels and no deeper.
        $this->assertSame(0, Category::whereIn('parent_id', Category::whereNotNull('parent_id')->select('id'))->count());
    }

    public function test_it_is_idempotent()
    {
        $this->seed(CategoriesSeeder::class);
        $count = Category::count();

        $this->seed(CategoriesSeeder::class);

        $this->assertSame($count, Category::count());
    }

    /** Run on a site already in use: what the admin changed stays changed. */
    public function test_it_keeps_what_is_already_there()
    {
        $fruit = Category::create(['name' => 'Voće i bobice', 'slug' => 'voce', 'search_name' => 'Voće sa juga']);
        $ajvar = Category::create(['name' => 'Ajvar', 'slug' => 'ajvar']);

        $this->seed(CategoriesSeeder::class);

        $this->assertSame(['Voće i bobice', 'Voće sa juga'], [$fruit->refresh()->name, $fruit->search_name]);
        // Left at the top where it was put, with the search phrase it lacked.
        $this->assertNull($ajvar->refresh()->parent_id);
        $this->assertSame('Domaći ajvar', $ajvar->search_name);
        $this->assertSame(1, Category::where('slug', 'ajvar')->count());
    }
}
