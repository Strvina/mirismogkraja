<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\Product;
use App\Models\Report;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Task 21: the platform is not a party to the sale, so a report is the only
 * way trouble reaches an admin before it turns into a public review - and a
 * verified badge is the only signal that someone checked who a producer is.
 */
class ReportAndVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $this->seed(RolesSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        return $admin;
    }

    public function test_a_buyer_can_report_a_producer(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();

        $this->actingAs($buyer)->post(route('reports.store'), [
            'reportable_type' => 'household',
            'reportable_id' => $producer->id,
            'reason' => 'prevara',
            'message' => 'Uplatio sam, nije poslao.',
        ])->assertRedirect();

        $report = Report::sole();
        $this->assertTrue($report->reportable->is($producer));
        $this->assertSame(Report::STATUS_OPEN, $report->status);
        $this->assertSame($buyer->id, $report->reported_by);
    }

    public function test_a_product_and_a_user_can_be_reported_too(): void
    {
        $reporter = User::factory()->create();
        $product = Product::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($reporter)->post(route('reports.store'), [
            'reportable_type' => 'product',
            'reportable_id' => $product->id,
            'reason' => 'neispravan_proizvod',
        ]);

        $this->actingAs($reporter)->post(route('reports.store'), [
            'reportable_type' => 'user',
            'reportable_id' => $other->id,
            'reason' => 'spam',
        ]);

        $this->assertSame(2, Report::count());
    }

    /** The type is a morph alias, so no request can name an arbitrary model. */
    public function test_an_unknown_type_is_rejected(): void
    {
        $this->actingAs(User::factory()->create())->post(route('reports.store'), [
            'reportable_type' => 'App\\Models\\User',
            'reportable_id' => 1,
            'reason' => 'spam',
        ])->assertSessionHasErrors('reportable_type');

        $this->assertSame(0, Report::count());
    }

    public function test_a_reason_outside_the_list_is_rejected(): void
    {
        $producer = Producer::factory()->active()->create();

        $this->actingAs(User::factory()->create())->post(route('reports.store'), [
            'reportable_type' => 'household',
            'reportable_id' => $producer->id,
            'reason' => 'sta-god',
        ])->assertSessionHasErrors('reason');
    }

    /** One report per person per thing: a second replaces the first. */
    public function test_reporting_the_same_thing_twice_updates_the_report(): void
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();

        $this->actingAs($buyer)->post(route('reports.store'), [
            'reportable_type' => 'household', 'reportable_id' => $producer->id, 'reason' => 'spam',
        ]);
        $this->actingAs($buyer)->post(route('reports.store'), [
            'reportable_type' => 'household', 'reportable_id' => $producer->id, 'reason' => 'prevara',
        ]);

        $this->assertSame('prevara', Report::sole()->reason);
    }

    public function test_guests_cannot_report(): void
    {
        $producer = Producer::factory()->active()->create();

        $this->post(route('reports.store'), [
            'reportable_type' => 'household', 'reportable_id' => $producer->id, 'reason' => 'spam',
        ])->assertRedirect(route('login'));
    }

    public function test_only_an_admin_sees_the_queue_and_can_decide(): void
    {
        $this->seed(RolesSeeder::class);
        $buyer = User::factory()->create();
        $producer = Producer::factory()->active()->create();
        $this->actingAs($buyer)->post(route('reports.store'), [
            'reportable_type' => 'household', 'reportable_id' => $producer->id, 'reason' => 'spam',
        ]);

        $report = Report::sole();

        $this->actingAs($buyer)->get(route('admin.reports.index'))->assertForbidden();
        $this->actingAs($buyer)->patch(route('admin.reports.update', $report), ['status' => 'reviewed'])->assertForbidden();

        $this->actingAs($this->admin())->get(route('admin.reports.index'))->assertInertia(
            fn ($page) => $page->has('reports', 1)
                ->where('reports.0.subject.name', $producer->name)
                ->where('counts.open', 1)
        );

        $this->actingAs($this->admin())->patch(route('admin.reports.update', $report), ['status' => 'reviewed']);
        $this->assertSame(Report::STATUS_REVIEWED, $report->refresh()->status);
        $this->assertNotNull($report->reviewed_at);
    }

    public function test_an_admin_marks_a_producer_verified_and_the_owner_is_told(): void
    {
        $producer = Producer::factory()->active()->create();

        $this->actingAs($this->admin())->patch(route('admin.producers.verify', $producer), ['verified' => true]);

        $this->assertNotNull($producer->refresh()->verified_at);
        $this->assertSame('producer.verified', $producer->user->notifications()->sole()->data['type']);

        $this->get(route('marketplace.producers.show', $producer->slug))
            ->assertInertia(fn ($page) => $page->whereNot('producer.verified_at', null));
    }

    public function test_verification_can_be_taken_away(): void
    {
        $producer = Producer::factory()->active()->create(['verified_at' => now()]);

        $this->actingAs($this->admin())->patch(route('admin.producers.verify', $producer), ['verified' => false]);

        $this->assertNull($producer->refresh()->verified_at);
    }

    public function test_only_an_admin_can_verify(): void
    {
        $this->seed(RolesSeeder::class);
        $producer = Producer::factory()->active()->create();

        $this->actingAs($producer->user)->patch(route('admin.producers.verify', $producer), ['verified' => true])->assertForbidden();
        $this->assertNull($producer->refresh()->verified_at);
    }
}
