<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use App\Models\WeeklyPick;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** "Proizvođač nedelje" (task 20.7). */
class WeeklyPickTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        return $admin;
    }

    private function thisWeek(): string
    {
        return WeeklyPick::weekOf()->toDateString();
    }

    public function test_the_pick_of_the_week_is_on_the_homepage_and_its_producer_is_told(): void
    {
        $producer = Producer::factory()->active()->create(['name' => 'Pčelarstvo Nikolić']);
        $product = Product::factory()->for($producer)->create(['name' => 'Bagremov med']);

        $this->actingAs($this->admin())->post(route('admin.weekly-picks.store'), [
            'household_id' => $producer->id,
            'product_id' => $product->id,
            'starts_on' => $this->thisWeek(),
        ])->assertSessionHasNoErrors();

        $this->get('/')->assertInertia(fn ($page) => $page
            ->where('weeklyPick.producer.name', 'Pčelarstvo Nikolić')
            ->where('weeklyPick.product.name', 'Bagremov med'));

        $this->assertSame('weekly-pick', $producer->user->notifications()->sole()->data['type']);
    }

    public function test_a_week_holds_one_pick_and_choosing_again_replaces_it(): void
    {
        $admin = $this->admin();
        [$first, $second] = Producer::factory()->active()->count(2)->create();

        foreach ([$first, $second] as $producer) {
            $this->actingAs($admin)->post(route('admin.weekly-picks.store'), ['household_id' => $producer->id, 'starts_on' => $this->thisWeek()]);
        }

        $this->assertSame($second->id, WeeklyPick::sole()->household_id);
        $this->get('/')->assertInertia(fn ($page) => $page->where('weeklyPick.producer.id', $second->id)->where('weeklyPick.product', null));
    }

    /** Only something the public can open, and only a product of that producer. */
    public function test_an_unpublished_producer_or_someone_elses_product_is_refused(): void
    {
        $admin = $this->admin();
        $pending = Producer::factory()->create(['status' => 'pending']);
        $producer = Producer::factory()->active()->create();
        $foreign = Product::factory()->for(Producer::factory()->active())->create();

        $this->actingAs($admin)
            ->post(route('admin.weekly-picks.store'), ['household_id' => $pending->id, 'starts_on' => $this->thisWeek()])
            ->assertSessionHasErrors('household_id');
        $this->actingAs($admin)
            ->post(route('admin.weekly-picks.store'), ['household_id' => $producer->id, 'product_id' => $foreign->id, 'starts_on' => $this->thisWeek()])
            ->assertSessionHasErrors('product_id');
        $this->actingAs($admin)
            ->post(route('admin.weekly-picks.store'), ['household_id' => $producer->id, 'starts_on' => '2020-01-06'])
            ->assertSessionHasErrors('starts_on');

        $this->assertSame(0, WeeklyPick::count());
    }

    public function test_a_producer_blocked_mid_week_leaves_the_homepage(): void
    {
        $producer = Producer::factory()->active()->create();
        WeeklyPick::create(['household_id' => $producer->id, 'starts_on' => $this->thisWeek()]);

        $producer->update(['status' => 'blocked']);

        $this->get('/')->assertInertia(fn ($page) => $page->where('weeklyPick', null));
    }

    public function test_last_weeks_pick_is_history_not_the_homepage(): void
    {
        $producer = Producer::factory()->active()->create();
        WeeklyPick::create(['household_id' => $producer->id, 'starts_on' => WeeklyPick::weekOf()->subWeek()->toDateString()]);

        $this->get('/')->assertInertia(fn ($page) => $page->where('weeklyPick', null));

        // ...but it still flags the producer as picked recently.
        $this->actingAs($this->admin())->get(route('admin.weekly-picks.index'))
            ->assertInertia(fn ($page) => $page->where('producers.0.recent', true)->has('picks.data', 1));
    }

    public function test_only_an_admin_can_pick(): void
    {
        $producer = Producer::factory()->active()->create();

        $this->actingAs(User::factory()->create())
            ->post(route('admin.weekly-picks.store'), ['household_id' => $producer->id, 'starts_on' => $this->thisWeek()])
            ->assertForbidden();
    }
}
