<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Support\Media;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * What happens to everyone else when one side leaves the site, and the
 * moderation an owner must not be able to undo.
 */
class DepartedAccountsAndModerationTest extends TestCase
{
    use RefreshDatabase;

    private function thread(): array
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        ProducerMessage::create(['producer_id' => $producer->id, 'buyer_id' => $buyer->id, 'sender_id' => $buyer->id, 'body' => 'Imate li meda?']);

        return [$buyer, $producer];
    }

    public function test_an_archived_producer_leaves_a_readable_closed_thread(): void
    {
        [$buyer, $producer] = $this->thread();
        $producer->delete();

        $this->actingAs($buyer)->get('/poruke')->assertOk()
            ->assertInertia(fn ($page) => $page->where('threads.data.0.title', $producer->name));

        $this->actingAs($buyer)->get(route('messages.show', $producer->slug))->assertOk()
            ->assertInertia(fn ($page) => $page->where('closed', 'producer')->has('messages.data', 1));

        $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Halo?'])->assertForbidden();
        $this->assertSame(1, ProducerMessage::count());
    }

    public function test_a_deleted_buyer_leaves_a_readable_closed_thread_for_the_seller(): void
    {
        [$buyer, $producer] = $this->thread();
        $this->actingAs($buyer)->delete(route('profile.destroy'), ['password' => 'password']);

        $this->actingAs($producer->user)->get('/poruke')->assertOk()
            ->assertInertia(fn ($page) => $page->where('threads.data.0.title', 'Obrisan korisnik'));

        $this->actingAs($producer->user)->get(route('messages.thread', [$producer->id, $buyer->id]))->assertOk()
            ->assertInertia(fn ($page) => $page->where('closed', 'buyer'));

        $this->actingAs($producer->user)->post(route('messages.thread.store', [$producer->id, $buyer->id]), ['body' => 'Hvala'])->assertForbidden();
    }

    public function test_a_deleted_reviewer_keeps_the_producer_page_working_without_their_name(): void
    {
        $author = User::factory()->create(['name' => 'Petar Petrović']);
        $producer = Producer::factory()->active()->create();
        Review::create(['user_id' => $author->id, 'producer_id' => $producer->id, 'rating' => 5, 'status' => Review::STATUS_APPROVED]);

        $this->actingAs($author)->delete(route('profile.destroy'), ['password' => 'password']);

        $this->get(route('marketplace.producers.show', $producer->slug))->assertOk()
            ->assertInertia(fn ($page) => $page->where('reviews.data.0.user.name', 'Obrisan korisnik'));
    }

    public function test_deleting_an_account_clears_every_personal_detail(): void
    {
        Storage::fake('public');
        $user = User::factory()->create([
            'name' => 'Ana Anić', 'phone' => '0601234567', 'address' => 'Glavna 1', 'city' => 'Niš', 'lat' => 43.3, 'lng' => 21.9,
            'avatar_path' => 'avatars/ana.jpg',
        ]);
        Storage::disk('public')->put('avatars/ana.jpg', 'x');

        $this->actingAs($user)->delete(route('profile.destroy'), ['password' => 'password']);

        $user = User::withTrashed()->find($user->id);
        $this->assertSame('Obrisan korisnik', $user->name);
        $this->assertNull($user->phone);
        $this->assertNull($user->address);
        $this->assertNull($user->city);
        $this->assertNull($user->lat);
        $this->assertNull($user->avatar_path);
        Storage::disk('public')->assertMissing('avatars/ana.jpg');
    }

    public function test_a_product_blocked_by_an_admin_stays_blocked_whatever_the_owner_sends(): void
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create()->assignRole('admin');
        $producer = Producer::factory()->active()->create();
        $product = Product::factory()->for($producer)->create(['status' => 'active']);
        $form = fn (string $status) => [
            'category_id' => Category::factory()->create()->id, 'name' => $product->name, 'price' => 100,
            'unit' => 'kg', 'stock_quantity' => 1, 'status' => $status,
        ];

        $this->actingAs($admin)->put(route('admin.products.update', $product), $form('blocked'))->assertSessionHasNoErrors()->assertRedirect();
        $this->assertSame('blocked', $product->fresh()->status);
        $this->assertSame('product.blocked', $producer->user->notifications()->first()->data['type']);

        $this->actingAs($producer->user)->put(route('producers.products.update', [$producer, $product]), $form('active'))
            ->assertSessionHasErrors('status');
        $this->assertSame('blocked', $product->fresh()->status);

        // The owner can still correct the text; it stays down.
        $this->actingAs($producer->user)->put(route('producers.products.update', [$producer, $product]), [...$form('blocked'), 'name' => 'Ispravljen naziv'])
            ->assertSessionHasNoErrors();
        $this->assertSame('blocked', $product->fresh()->status);
        $this->get(route('marketplace.products.show', $product->fresh()->slug))->assertNotFound();
    }

    public function test_a_photo_with_absurd_dimensions_is_refused(): void
    {
        Storage::fake('public');
        $producer = Producer::factory()->active()->create();
        $product = Product::factory()->for($producer)->create();

        $this->actingAs($producer->user)
            ->post(route('producers.products.images.store', [$producer, $product]), [
                'images' => [$this->fakeImage('bomb.png', Media::MAX_SIDE + 1, 1)],
            ])
            ->assertSessionHasErrors('images.0');

        $this->assertSame(0, $product->images()->count());
    }
}
