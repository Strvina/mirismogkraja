<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\User;
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

    public function test_the_notifications_page_opens_with_and_without_notifications(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('notifications.index'))->assertOk();

        $producer = Producer::factory()->active()->create();
        $this->actingAs($user)->post(route('messages.store', $producer->slug), ['body' => 'Zdravo']);

        $this->actingAs($producer->user)->get(route('notifications.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('notifications/index')->has('notifications.data', 1));
    }

    /** The page's own prop and the bell's are different things. */
    public function test_the_page_prop_and_the_bells_prop_do_not_collide(): void
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $this->actingAs($user)->post(route('messages.store', $producer->slug), ['body' => 'Zdravo']);

        $owner = $producer->user;

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
