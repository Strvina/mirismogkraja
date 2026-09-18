<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->words(2, true);

        return [
            'household_id' => Producer::factory(),
            'category_id' => Category::factory(),
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->randomNumber(5),
            'description' => fake()->paragraph(),
            'price' => fake()->randomFloat(2, 100, 5000),
            'unit' => fake()->randomElement(['kg', 'g', 'l', 'ml', 'kom', 'paket']),
            'stock_quantity' => fake()->numberBetween(0, 100),
            'status' => 'active',
        ];
    }
}
