<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocalizationAndMetaTest extends TestCase
{
    use RefreshDatabase;

    public function test_validation_errors_are_in_serbian(): void
    {
        $this->actingAs(User::factory()->create())
            ->post(route('producers.store'), [])
            ->assertSessionHasErrors(['name' => 'Ovo polje je obavezno.']);
    }

    public function test_a_failed_login_is_explained_in_serbian(): void
    {
        $user = User::factory()->create();

        $this->post('/login', ['email' => $user->email, 'password' => 'pogresna'])
            ->assertSessionHasErrors(['email' => 'Pogrešan e-mail ili lozinka.']);
    }

    /**
     * Link previews never run JavaScript, so the tags have to be in the
     * first HTML response.
     */
    public function test_a_producer_page_carries_its_link_preview_in_the_html(): void
    {
        $producer = Producer::factory()->active()->create([
            'name' => 'Pčelarstvo Nikolić',
            'city' => 'Niš',
            'description' => 'Livadski i bagremov med sa Suve planine.',
            'cover_image_path' => 'producers/covers/med.jpg',
        ]);

        $this->get(route('marketplace.producers.show', $producer->slug))
            ->assertSee('<meta property="og:title" content="Pčelarstvo Nikolić - Niš">', false)
            ->assertSee('<meta name="description" content="Livadski i bagremov med sa Suve planine.">', false)
            ->assertSee('storage/producers/covers/med.jpg', false)
            ->assertSee('<link rel="canonical" href="'.route('marketplace.producers.show', $producer->slug).'">', false);
    }

    public function test_a_product_page_carries_its_link_preview_in_the_html(): void
    {
        $product = Product::factory()->for(Producer::factory()->active()->state(['name' => 'Mlekara Zapis']))->create(['name' => 'Sir iz kriške']);

        $this->get(route('marketplace.products.show', $product->slug))
            ->assertSee('<meta property="og:title" content="Sir iz kriške — cena i prodaja | Mlekara Zapis">', false)
            ->assertSee('<meta property="og:type" content="product">', false);
    }
}
