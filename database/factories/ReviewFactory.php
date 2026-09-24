<?php

namespace Database\Factories;

use App\Models\Producer;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Review>
 */
class ReviewFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'household_id' => Producer::factory(),
            'rating' => fake()->numberBetween(1, 5),
            'comment' => fake()->sentence(),
            // Approved by default: the factory stands in for reviews that
            // are already on a producer's page. Use pending() for the
            // moderation queue.
            'status' => Review::STATUS_APPROVED,
            'approved_at' => now(),
        ];
    }

    /** A freshly written review, still waiting for an admin. */
    public function pending(): static
    {
        return $this->state(fn () => [
            'status' => Review::STATUS_PENDING,
            'approved_at' => null,
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn () => [
            'status' => Review::STATUS_REJECTED,
            'approved_at' => null,
        ]);
    }
}
