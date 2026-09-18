<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_login()
    {
        $producer = Producer::factory()->create();

        $this->get(route('producers.products.index', $producer))->assertRedirect('/login');
    }

    public function test_owner_can_create_a_product_for_their_producer()
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->for($user)->create();
        $category = Category::factory()->create();

        $response = $this->actingAs($user)->post(route('producers.products.store', $producer), [
            'category_id' => $category->id,
            'name' => 'Domaći ajvar',
            'price' => 450,
            'unit' => 'kom',
            'stock_quantity' => 10,
            'status' => 'active',
        ]);

        $response->assertRedirect(route('producers.products.index', $producer));

        $product = Product::sole();
        $this->assertSame($producer->id, $product->household_id);
        $this->assertSame('domaci-ajvar', $product->slug);
    }

    public function test_non_owner_cannot_create_a_product_for_someone_elses_producer()
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->create(); // owned by someone else
        $category = Category::factory()->create();

        $this->actingAs($user)->post(route('producers.products.store', $producer), [
            'category_id' => $category->id,
            'name' => 'Tuđi proizvod',
            'price' => 100,
            'unit' => 'kom',
            'stock_quantity' => 1,
            'status' => 'active',
        ])->assertForbidden();
    }

    public function test_non_owner_cannot_edit_or_delete_a_product()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(); // owned by someone else via producer

        $this->actingAs($user)->get(route('producers.products.edit', [$product->producer, $product]))->assertForbidden();
        $this->actingAs($user)->put(route('producers.products.update', [$product->producer, $product]), [])->assertForbidden();
        $this->actingAs($user)->delete(route('producers.products.destroy', [$product->producer, $product]))->assertForbidden();
    }

    public function test_owner_can_update_and_delete_their_product()
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->for($user)->create();
        $product = Product::factory()->for($producer)->create(['name' => 'Staro ime']);
        $category = Category::factory()->create();

        $this->actingAs($user)->put(route('producers.products.update', [$producer, $product]), [
            'category_id' => $category->id,
            'name' => 'Novo ime',
            'price' => 200,
            'unit' => 'kg',
            'stock_quantity' => 5,
            'status' => 'active',
        ])->assertRedirect(route('producers.products.index', $producer));

        $this->assertSame('Novo ime', $product->fresh()->name);

        $this->actingAs($user)->delete(route('producers.products.destroy', [$producer, $product]))
            ->assertRedirect(route('producers.products.index', $producer));

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }
}
