<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\Product;
use App\Models\ProductAlert;
use App\Models\User;
use App\Notifications\SiteNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/** "Javi mi kad stigne". */
class ProductAlertTest extends TestCase
{
    use RefreshDatabase;

    private function soldOut(): Product
    {
        return Product::factory()->for(Producer::factory()->active())->create(['status' => 'active', 'stock_quantity' => 0]);
    }

    public function test_a_visitor_asks_to_be_told_and_can_call_it_off(): void
    {
        $user = User::factory()->unverified()->create();
        $product = $this->soldOut();

        $this->actingAs($user)->get(route('marketplace.products.show', $product->slug))
            ->assertInertia(fn ($page) => $page->where('available', false)->where('alertRequested', false));

        // Signing in is enough; it reaches nobody else.
        $this->actingAs($user)->post(route('products.alert', $product->slug))->assertRedirect();
        $this->assertTrue(ProductAlert::where('user_id', $user->id)->where('product_id', $product->id)->exists());

        $this->actingAs($user)->post(route('products.alert', $product->slug));
        $this->assertSame(0, ProductAlert::count());
    }

    public function test_nobody_waits_for_what_is_already_there_or_for_their_own_product(): void
    {
        $inStock = Product::factory()->for(Producer::factory()->active())->create(['status' => 'active', 'stock_quantity' => 5]);
        $own = $this->soldOut();

        $this->actingAs(User::factory()->create())->post(route('products.alert', $inStock->slug));
        $this->actingAs($own->producer->user)->post(route('products.alert', $own->slug))->assertForbidden();

        $this->assertSame(0, ProductAlert::count());
    }

    public function test_the_alert_goes_out_once_the_product_is_back_and_is_then_forgotten(): void
    {
        Notification::fake();
        $verified = User::factory()->create();
        $unverified = User::factory()->unverified()->create();
        $product = $this->soldOut();
        ProductAlert::create(['user_id' => $verified->id, 'product_id' => $product->id]);
        ProductAlert::create(['user_id' => $unverified->id, 'product_id' => $product->id]);

        $this->artisan('products:send-alerts')->assertSuccessful();
        Notification::assertNothingSent();

        $product->update(['stock_quantity' => 3]);
        $this->artisan('products:send-alerts')->assertSuccessful();

        Notification::assertSentTo($verified, SiteNotification::class, fn ($notification, array $channels) => $channels === ['database', 'mail']);
        // No e-mail to an address nobody has confirmed - the bell only.
        Notification::assertSentTo($unverified, SiteNotification::class, fn ($notification, array $channels) => $channels === ['database']);
        $this->assertSame(0, ProductAlert::count());
    }

    public function test_out_of_season_counts_as_unavailable_until_the_season_starts(): void
    {
        Notification::fake();
        $this->travelTo(now()->setDate(2026, 5, 10));
        $user = User::factory()->create();
        $product = Product::factory()->for(Producer::factory()->active())->create(['status' => 'active', 'stock_quantity' => 10, 'season_from' => 6, 'season_to' => 8]);

        $this->assertFalse($product->isAvailable());
        $this->actingAs($user)->post(route('products.alert', $product->slug));

        $this->artisan('products:send-alerts');
        Notification::assertNothingSent();

        $this->travelTo(now()->setDate(2026, 6, 1));
        $this->artisan('products:send-alerts');
        Notification::assertSentTo($user, SiteNotification::class);
    }

    public function test_the_mail_says_what_the_bell_says(): void
    {
        $user = User::factory()->create();
        $mail = SiteNotification::productAvailable('Kupine', 'Voćnjak Mitić', url('/proizvod/kupine'))->alsoByMail()->toMail($user);

        $this->assertSame('Stiglo je: Kupine', $mail->subject);
        $this->assertSame(url('/proizvod/kupine'), $mail->actionUrl);
    }
}
