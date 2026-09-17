<?php

namespace Tests\Feature;

use App\Models\Household;
use App\Models\Product;
use Database\Seeders\CategoriesSeeder;
use Database\Seeders\DemoContentSeeder;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoContentSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_two_active_households_with_a_product_per_category()
    {
        $this->seed(RolesSeeder::class);
        $this->seed(CategoriesSeeder::class);
        $this->seed(DemoContentSeeder::class);

        $this->assertSame(2, Household::count());
        $this->assertTrue(Household::where('status', 'active')->count() === 2);

        $household = Household::first();
        $this->assertTrue($household->user->hasRole('seller'));
        $this->assertSame(9, Product::where('household_id', $household->id)->count());
    }
}
