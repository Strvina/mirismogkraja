<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Health;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

/**
 * Task 157: `/up` and `health:check` notice a cron that has stopped, and
 * every log line says which request and whose.
 */
class HealthAndLogContextTest extends TestCase
{
    use RefreshDatabase;

    public function test_up_answers_while_everything_is_there(): void
    {
        $this->get('/up')->assertOk();

        Health::beat();

        $this->get('/up')->assertOk();
    }

    public function test_up_fails_once_cron_has_been_silent_for_too_long(): void
    {
        $this->travelTo(now()->subMinutes(Health::SCHEDULER_SILENT_AFTER_MINUTES + 1), fn () => Health::beat());

        $this->get('/up')->assertStatus(500);

        // The next call from cron and it is up again.
        Health::beat();

        $this->get('/up')->assertOk();
    }

    public function test_the_command_names_each_check_and_fails_when_cron_never_ran(): void
    {
        $this->artisan('health:check')
            ->expectsOutputToContain('database')
            ->expectsOutputToContain('has never run')
            ->assertFailed();

        Health::beat();

        $this->artisan('health:check')->assertSuccessful();
    }

    public function test_the_scheduler_leaves_its_mark_every_minute(): void
    {
        $this->artisan('schedule:list')->expectsOutputToContain('scheduler-heartbeat');
    }

    public function test_a_request_is_logged_with_its_id_its_route_and_its_user(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('notifications.index'))->assertOk();
        $id = $response->headers->get('X-Request-Id');

        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}$/', (string) $id);
        $this->assertSame(
            ['request_id' => $id, 'route' => 'notifications.index', 'user_id' => $user->id],
            Context::only(['request_id', 'route', 'user_id']),
        );
    }

    public function test_a_guest_has_no_user_in_the_log_and_every_request_its_own_id(): void
    {
        $first = $this->get(route('login'))->headers->get('X-Request-Id');
        $this->assertNull(Context::get('user_id'));

        $this->assertNotSame($first, $this->get(route('login'))->headers->get('X-Request-Id'));
    }

    public function test_the_context_reaches_the_log_line(): void
    {
        config(['logging.default' => 'json', 'logging.channels.json.path' => $file = storage_path('logs/test-'.uniqid().'.log')]);
        Context::add('request_id', 'abc');

        Log::warning('Nešto nije u redu');

        $line = json_decode((string) file_get_contents($written = glob(str_replace('.log', '*.log', $file))[0]), true);
        unlink($written);

        $this->assertSame('Nešto nije u redu', $line['message']);
        $this->assertSame('abc', $line['extra']['request_id']);
    }
}
