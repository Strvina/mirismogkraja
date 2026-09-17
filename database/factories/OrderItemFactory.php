<?php

namespace Database\Factories;

use App\Models\Household;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderItem>
 */
class OrderItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $quantity = fake()->numberBetween(1, 5);
        $unitPrice = fake()->randomFloat(2, 100, 1000);

        return [
            'order_id' => Order::factory(),
            'product_id' => Product::factory(),
            'household_id' => Household::factory(),
            'product_name' => fake()->words(2, true),
            'unit_price' => $unitPrice,
            'quantity' => $quantity,
            'subtotal' => $unitPrice * $quantity,
        ];
    }
}
