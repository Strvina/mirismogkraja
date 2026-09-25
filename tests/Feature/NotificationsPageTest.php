<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Inertia;
use Tests\TestCase;

/**
 * The notifications page has a prop called `notifications`, and the bell in
 * the header used to share one by the same name. Page props are merged over
 * shared ones, so the two silently fought: on this page the bell asking for
 * "notifications" was handed a paginator and crashed the render. The shared
 * one is now `recentNotifications`, and these tests keep them apart.
 */
class NotificationsPageTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithOneNotification(): User
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $producer = Producer::factory()->create(['status' => 'pending']);
        $this->actingAs($admin)->patch(route('admin.producers.status', $producer), ['status' => 'active']);

        return $producer->user;
    }

    public function test_the_notifications_page_opens_with_and_without_notifications(): void
    {
        $this->actingAs(User::factory()->create())->get(route('notifications.index'))->assertOk();

        $owner = $this->ownerWithOneNotification();

        $this->actingAs($owner)->get(route('notifications.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('notifications/index')->has('notifications.data', 1));
    }

    /** The page's own prop and the bell's are different things. */
    public function test_the_page_prop_and_the_bells_prop_do_not_collide(): void
    {
        $owner = $this->ownerWithOneNotification();

        // The page is served a paginator, and nothing named recentNotifications.
        $this->actingAs($owner)->get(route('notifications.index'))->assertInertia(
            fn ($page) => $page->has('notifications.data')->missing('recentNotifications')
        );

        // Opening the bell from this page asks for the list by its own name
        // and gets a list, not the page's paginator.
        $this->actingAs($owner)->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => Inertia::getVersion(),
            'X-Inertia-Partial-Component' => 'notifications/index',
            'X-Inertia-Partial-Data' => 'recentNotifications',
        ])->get(route('notifications.index'))->assertJsonCount(1, 'props.recentNotifications');
    }
}
