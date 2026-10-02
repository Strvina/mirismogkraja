<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Producer;
use App\Models\User;
use App\Services\ProductService;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

/** Files on disk and rows in the database stay in step. */
class UploadIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_sign_up_that_fails_half_way_leaves_no_photos_behind(): void
    {
        Storage::fake('public');
        $this->seed(RolesSeeder::class);
        $this->mock(ProductService::class)->shouldReceive('create')->andThrow(new RuntimeException('database went away'));

        $this->withoutExceptionHandling();

        try {
            $this->actingAs(User::factory()->create())->post(route('producers.store'), [
                'name' => 'Pčelarstvo Jovanović',
                'cover_image' => $this->fakeImage('cover.jpg'),
                'products' => [['name' => 'Med', 'category_id' => Category::factory()->create()->id, 'price' => 900, 'unit' => 'kg', 'stock_quantity' => 3, 'image' => $this->fakeImage('med.jpg')]],
            ]);
            $this->fail('The sign-up should have failed.');
        } catch (RuntimeException) {
            // Expected.
        }

        $this->assertSame(0, Producer::count());
        $this->assertSame([], Storage::disk('public')->allFiles());
    }
}
