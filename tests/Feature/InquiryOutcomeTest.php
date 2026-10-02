<?php

namespace Tests\Feature;

use App\Models\InquiryOutcome;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** How an inquiry ended, as the producer reports it (task 14, point 5). */
class InquiryOutcomeTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_producer_notes_the_outcome_and_the_admin_sees_the_summary(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $product = Product::factory()->for($producer)->create(['name' => 'Bagremov med']);

        $this->actingAs($buyer)->post(route('inquiries.store', $product->slug), ['body' => 'Imate li tegle od kilo?']);
        $this->actingAs($producer->user)
            ->patch(route('messages.outcome', [$producer->id, $buyer->id]), ['status' => 'completed'])
            ->assertSessionHasNoErrors();

        $outcome = InquiryOutcome::sole();
        $this->assertSame('completed', $outcome->status);
        $this->assertSame($product->id, $outcome->product_id);

        $this->actingAs($producer->user)->get(route('messages.index'))
            ->assertInertia(fn ($page) => $page->where('threads.data.0.outcome', 'Realizovano'));
        $this->actingAs($producer->user)->get(route('messages.thread', [$producer->id, $buyer->id]))
            ->assertInertia(fn ($page) => $page->where('outcome', 'completed'));

        // The buyer never sees the producer's note.
        $this->actingAs($buyer)->get(route('messages.index'))->assertInertia(fn ($page) => $page->where('threads.data.0.outcome', null));
        $this->actingAs($buyer)->get(route('messages.show', $producer->slug))->assertInertia(fn ($page) => $page->where('outcome', null));

        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $this->actingAs($admin)->get(route('admin.dashboard'))->assertInertia(fn ($page) => $page
            ->where('outcomes.counts.completed', 1)
            ->where('outcomes.topProducts.0.name', 'Bagremov med'));

        // Changing it replaces the note; clearing it removes it.
        $this->actingAs($producer->user)->patch(route('messages.outcome', [$producer->id, $buyer->id]), ['status' => 'cancelled']);
        $this->assertSame('cancelled', InquiryOutcome::sole()->status);
        $this->actingAs($producer->user)->patch(route('messages.outcome', [$producer->id, $buyer->id]), ['status' => '']);
        $this->assertSame(0, InquiryOutcome::count());
    }

    public function test_only_the_owner_and_only_known_statuses(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $this->actingAs($buyer)->post(route('messages.store', $producer->slug), ['body' => 'Zdravo']);

        $this->actingAs($buyer)->patch(route('messages.outcome', [$producer->id, $buyer->id]), ['status' => 'completed'])->assertForbidden();
        $this->actingAs($producer->user)->patch(route('messages.outcome', [$producer->id, $buyer->id]), ['status' => 'paid'])->assertSessionHasErrors('status');

        $this->assertSame(0, InquiryOutcome::count());
    }
}
