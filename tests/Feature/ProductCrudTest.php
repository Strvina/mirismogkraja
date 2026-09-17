<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Household;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_login()
    {
        $household = Household::factory()->create();

        $this->get(route('households.products.index', $household))->assertRedirect('/login');
    }

    public function test_owner_can_create_a_product_for_their_household()
    {
        $user = User::factory()->create();
        $household = Household::factory()->for($user)->create();
        $category = Category::factory()->create();

        $response = $this->actingAs($user)->post(route('households.products.store', $household), [
            'category_id' => $category->id,
            'name' => 'Domaći ajvar',
            'price' => 450,
            'unit' => 'kom',
            'stock_quantity' => 10,
            'status' => 'active',
        ]);

        $response->assertRedirect(route('households.products.index', $household));

        $product = Product::sole();
        $this->assertSame($household->id, $product->household_id);
        $this->assertSame('domaci-ajvar', $product->slug);
    }

    public function test_non_owner_cannot_create_a_product_for_someone_elses_household()
    {
        $user = User::factory()->create();
        $household = Household::factory()->create(); // owned by someone else
        $category = Category::factory()->create();

        $this->actingAs($user)->post(route('households.products.store', $household), [
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
        $product = Product::factory()->create(); // owned by someone else via household

        $this->actingAs($user)->get(route('households.products.edit', [$product->household, $product]))->assertForbidden();
        $this->actingAs($user)->put(route('households.products.update', [$product->household, $product]), [])->assertForbidden();
        $this->actingAs($user)->delete(route('households.products.destroy', [$product->household, $product]))->assertForbidden();
    }

    public function test_owner_can_update_and_delete_their_product()
    {
        $user = User::factory()->create();
        $household = Household::factory()->for($user)->create();
        $product = Product::factory()->for($household)->create(['name' => 'Staro ime']);
        $category = Category::factory()->create();

        $this->actingAs($user)->put(route('households.products.update', [$household, $product]), [
            'category_id' => $category->id,
            'name' => 'Novo ime',
            'price' => 200,
            'unit' => 'kg',
            'stock_quantity' => 5,
            'status' => 'active',
        ])->assertRedirect(route('households.products.index', $household));

        $this->assertSame('Novo ime', $product->fresh()->name);

        $this->actingAs($user)->delete(route('households.products.destroy', [$household, $product]))
            ->assertRedirect(route('households.products.index', $household));

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }
}
