<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Household;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoContentSeeder extends Seeder
{
    /**
     * A couple of demo households, each with a product per category, so
     * there's realistic content to work against while building the
     * marketplace UI (task 3.9) - doesn't need to wait for Faza 8.
     */
    public function run(): void
    {
        $households = [
            ['name' => 'Domaćinstvo Nićić', 'city' => 'Leskovac'],
            ['name' => 'Mlekara Zapis', 'city' => 'Zlatibor'],
        ];

        $categories = Category::all();

        foreach ($households as $data) {
            $user = User::factory()->create();
            $user->assignRole('buyer', 'seller');

            $household = Household::factory()->for($user)->active()->create([
                'name' => $data['name'],
                'city' => $data['city'],
            ]);

            foreach ($categories as $category) {
                Product::factory()->for($household)->for($category)->create(['status' => 'active']);
            }
        }
    }
}
