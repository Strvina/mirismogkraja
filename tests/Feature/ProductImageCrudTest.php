<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProductImageCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_upload_multiple_images_and_first_becomes_main()
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $product = Product::factory()->for($producer = Producer::factory()->for($user)->create())->create();

        $this->actingAs($user)->post(route('producers.products.images.store', [$producer, $product]), [
            'images' => [
                UploadedFile::fake()->create('a.jpg', 10, 'image/jpeg'),
                UploadedFile::fake()->create('b.jpg', 10, 'image/jpeg'),
            ],
        ]);

        $product->refresh();
        $this->assertCount(2, $product->images);
        $this->assertSame(0, $product->images->first()->order);
    }

    public function test_non_owner_cannot_upload_images()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create();

        $this->actingAs($user)->post(route('producers.products.images.store', [$product->producer, $product]), [
            'images' => [UploadedFile::fake()->create('a.jpg', 10, 'image/jpeg')],
        ])->assertForbidden();
    }

    public function test_owner_can_delete_an_image()
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $product = Product::factory()->for(Producer::factory()->for($user))->create();
        $image = $product->images()->create(['path' => 'products/x.jpg', 'order' => 0]);
        Storage::disk('public')->put('products/x.jpg', 'fake');

        $this->actingAs($user)->delete(route('producers.products.images.destroy', [$product->producer, $product, $image]));

        $this->assertDatabaseMissing('product_images', ['id' => $image->id]);
        Storage::disk('public')->assertMissing('products/x.jpg');
    }

    public function test_owner_can_set_a_different_image_as_primary()
    {
        $user = User::factory()->create();
        $product = Product::factory()->for(Producer::factory()->for($user))->create();
        $main = $product->images()->create(['path' => 'a.jpg', 'order' => 0]);
        $other = $product->images()->create(['path' => 'b.jpg', 'order' => 1]);

        $this->actingAs($user)->patch(route('producers.products.images.primary', [$product->producer, $product, $other]));

        $this->assertSame(0, $other->fresh()->order);
        $this->assertSame(1, $main->fresh()->order);
    }
}
