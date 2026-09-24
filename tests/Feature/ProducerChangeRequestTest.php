<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerChangeRequest;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Task 15 draws a line through a producer's own fields: what its owner keeps
 * current they change themselves, and what an admin approved they may only
 * ask to change.
 */
class ProducerChangeRequestTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        return $admin;
    }

    /** @return array<string, mixed> */
    private function form(Producer $producer, array $overrides = []): array
    {
        return array_merge([
            'name' => $producer->name,
            'description' => $producer->description,
            'city' => $producer->city,
        ], $overrides);
    }

    public function test_an_owner_changes_their_own_details_immediately(): void
    {
        $producer = Producer::factory()->active()->create(['description' => 'Staro']);

        $this->actingAs($producer->user)
            ->put(route('producers.update', $producer), $this->form($producer, ['description' => 'Novo', 'city' => 'Niš']))
            ->assertRedirect();

        $producer->refresh();
        $this->assertSame('Novo', $producer->description);
        $this->assertSame('Niš', $producer->city);
        $this->assertSame(0, ProducerChangeRequest::count());
    }

    public function test_renaming_a_published_producer_is_a_request_not_an_edit(): void
    {
        $producer = Producer::factory()->active()->create(['name' => 'Domaćinstvo Nićić']);
        $slug = $producer->slug;

        $this->actingAs($producer->user)
            ->put(route('producers.update', $producer), $this->form($producer, ['name' => 'Nešto drugo']));

        // The producer stays online under the approved name and address.
        $producer->refresh();
        $this->assertSame('Domaćinstvo Nićić', $producer->name);
        $this->assertSame($slug, $producer->slug);

        $request = ProducerChangeRequest::sole();
        $this->assertSame('name', $request->field);
        $this->assertSame('Nešto drugo', $request->requested_value);
        $this->assertSame('Domaćinstvo Nićić', $request->current_value);
        $this->assertSame(ProducerChangeRequest::STATUS_PENDING, $request->status);
    }

    /** Nothing is published yet, so there is nothing to protect. */
    public function test_a_producer_awaiting_approval_can_still_be_renamed_freely(): void
    {
        $producer = Producer::factory()->create(['status' => 'pending', 'name' => 'Prvi pokušaj']);

        $this->actingAs($producer->user)
            ->put(route('producers.update', $producer), $this->form($producer, ['name' => 'Bolje ime']));

        $this->assertSame('Bolje ime', $producer->refresh()->name);
        $this->assertSame(0, ProducerChangeRequest::count());
    }

    /** Saving the form twice must not queue the same rename twice. */
    public function test_asking_twice_updates_the_same_request(): void
    {
        $producer = Producer::factory()->active()->create(['name' => 'Staro ime']);

        $this->actingAs($producer->user)->put(route('producers.update', $producer), $this->form($producer, ['name' => 'Prvo']));
        $this->actingAs($producer->user)->put(route('producers.update', $producer), $this->form($producer, ['name' => 'Drugo']));

        $this->assertSame('Drugo', ProducerChangeRequest::sole()->requested_value);
    }

    public function test_approving_a_request_applies_it_and_rebuilds_the_address(): void
    {
        $producer = Producer::factory()->active()->create(['name' => 'Staro ime']);
        $this->actingAs($producer->user)->put(route('producers.update', $producer), $this->form($producer, ['name' => 'Novo ime']));

        $this->actingAs($this->admin())
            ->patch(route('admin.change-requests.approve', ProducerChangeRequest::sole()))
            ->assertRedirect();

        $producer->refresh();
        $this->assertSame('Novo ime', $producer->name);
        $this->assertSame('novo-ime', $producer->slug);
        $this->assertSame(ProducerChangeRequest::STATUS_APPROVED, ProducerChangeRequest::sole()->status);

        // Approving is itself an answer the owner has been waiting for.
        $this->assertSame('change-request.approved', $producer->user->notifications()->latest()->first()->data['type']);
    }

    public function test_rejecting_a_request_leaves_the_producer_as_it_was(): void
    {
        $producer = Producer::factory()->active()->create(['name' => 'Staro ime']);
        $this->actingAs($producer->user)->put(route('producers.update', $producer), $this->form($producer, ['name' => 'Novo ime']));

        $this->actingAs($this->admin())->patch(route('admin.change-requests.reject', ProducerChangeRequest::sole()));

        $this->assertSame('Staro ime', $producer->refresh()->name);
        $this->assertSame(ProducerChangeRequest::STATUS_REJECTED, ProducerChangeRequest::sole()->status);
        $this->assertSame('change-request.rejected', $producer->user->notifications()->latest()->first()->data['type']);
    }

    public function test_only_an_admin_can_decide(): void
    {
        $this->seed(RolesSeeder::class);
        $producer = Producer::factory()->active()->create();
        $this->actingAs($producer->user)->put(route('producers.update', $producer), $this->form($producer, ['name' => 'Novo ime']));

        $request = ProducerChangeRequest::sole();

        $this->actingAs($producer->user)->get(route('admin.change-requests.index'))->assertForbidden();
        $this->actingAs($producer->user)->patch(route('admin.change-requests.approve', $request))->assertForbidden();

        $this->assertSame(ProducerChangeRequest::STATUS_PENDING, $request->refresh()->status);
    }

    /** The owner's own list has to explain why the name did not change. */
    public function test_the_owner_sees_that_a_rename_is_waiting(): void
    {
        $producer = Producer::factory()->active()->create(['name' => 'Staro ime']);
        $this->actingAs($producer->user)->put(route('producers.update', $producer), $this->form($producer, ['name' => 'Novo ime']));

        $this->actingAs($producer->user)->get(route('producers.index'))->assertInertia(
            fn ($page) => $page->has('pendingChanges', 1)->where('pendingChanges.0.requested_value', 'Novo ime')
        );
    }

    public function test_the_queue_opens_on_what_still_needs_a_decision(): void
    {
        $producer = Producer::factory()->active()->create();
        $this->actingAs($producer->user)->put(route('producers.update', $producer), $this->form($producer, ['name' => 'Novo ime']));

        $this->actingAs($this->admin())->get(route('admin.change-requests.index'))->assertInertia(
            fn ($page) => $page->where('filters.status', ProducerChangeRequest::STATUS_PENDING)
                ->has('requests', 1)
                ->where('counts.pending', 1)
        );
    }
}
