<?php

namespace Tests\Feature;

use App\Models\Favorite;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FavoriteModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_favorite_a_producer()
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->create();

        $favorite = Favorite::create([
            'user_id' => $user->id,
            'favoritable_id' => $producer->id,
            'favoritable_type' => 'household',
        ]);

        $this->assertTrue($favorite->favoritable->is($producer));
    }

    public function test_user_can_favorite_a_product()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create();

        $favorite = Favorite::create([
            'user_id' => $user->id,
            'favoritable_id' => $product->id,
            'favoritable_type' => 'product',
        ]);

        $this->assertTrue($favorite->favoritable->is($product));
    }

    public function test_cannot_favorite_the_same_item_twice()
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->create();
        Favorite::create(['user_id' => $user->id, 'favoritable_id' => $producer->id, 'favoritable_type' => 'household']);

        $this->expectException(QueryException::class);
        Favorite::create(['user_id' => $user->id, 'favoritable_id' => $producer->id, 'favoritable_type' => 'household']);
    }
}
