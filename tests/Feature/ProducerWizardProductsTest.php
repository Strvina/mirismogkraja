<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Producer;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** The sign-up wizard's optional products step. */
class ProducerWizardProductsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Creating a producer makes its owner a seller.
        $this->seed(RolesSeeder::class);
    }

    public function test_products_entered_in_the_wizard_are_created_with_the_producer(): void
    {
        Storage::fake('public');
        $honey = Category::factory()->create();

        $this->actingAs(User::factory()->create())->post(route('producers.store'), [
            'name' => 'Pčelarstvo Nikolić',
            'products' => [
                ['name' => 'Bagremov med', 'category_id' => $honey->id, 'price' => '950', 'unit' => 'kg', 'stock_quantity' => '12', 'image' => UploadedFile::fake()->create('med.jpg', 10, 'image/jpeg')],
                ['name' => 'Polen', 'category_id' => $honey->id, 'price' => '400', 'unit' => 'g', 'stock_quantity' => '0'],
            ],
        ])->assertSessionHasNoErrors();

        $producer = Producer::sole();
        $this->assertSame(['Bagremov med', 'Polen'], $producer->products()->orderBy('id')->pluck('name')->all());
        $this->assertSame(1, $producer->products()->firstWhere('name', 'Bagremov med')->images()->count());
        // Listed as active, and public the moment the producer is approved.
        $this->assertSame(0, $producer->products()->where('status', '!=', 'active')->count());
    }

    public function test_a_producer_can_be_created_without_products(): void
    {
        $this->actingAs(User::factory()->create())->post(route('producers.store'), ['name' => 'Samo profil'])->assertSessionHasNoErrors();

        $this->assertSame(0, Producer::sole()->products()->count());
    }

    /** A bad row is reported against its own field, and nothing is created. */
    public function test_an_incomplete_product_row_is_refused_by_field(): void
    {
        $this->actingAs(User::factory()->create())->post(route('producers.store'), [
            'name' => 'Pčelarstvo',
            'products' => [['name' => '', 'category_id' => '', 'price' => '-5', 'unit' => 'kg', 'stock_quantity' => '1']],
        ])->assertSessionHasErrors(['products.0.name', 'products.0.category_id', 'products.0.price']);

        $this->assertSame(0, Producer::count());
    }

    public function test_the_create_page_offers_the_categories(): void
    {
        Category::factory()->count(3)->create();

        $this->actingAs(User::factory()->create())->get(route('producers.create'))
            ->assertInertia(fn ($page) => $page->has('categories', 3));
    }
}
