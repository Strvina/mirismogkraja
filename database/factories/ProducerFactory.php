<?php

namespace Database\Factories;

use App\Models\Producer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Producer>
 */
class ProducerFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->company();

        return [
            'user_id' => User::factory(),
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->randomNumber(5),
            'description' => fake()->paragraph(),
            'address' => fake()->streetAddress(),
            'city' => fake()->city(),
            'status' => 'pending',
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => ['status' => 'active']);
    }
}
