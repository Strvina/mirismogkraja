<?php

namespace Tests\Feature;

use App\Models\Boost;
use App\Models\CampaignParticipant;
use App\Models\InquiryOutcome;
use App\Models\Post;
use App\Models\ProducerCertificate;
use App\Models\ProducerChangeRequest;
use App\Models\ProducerSubscription;
use App\Models\Referral;
use App\Models\Report;
use App\Models\Review;
use App\Models\User;
use App\Models\WantedAd;
use App\Services\ProducerStatistics;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * The database refuses a status or a kind the application does not know
 * (migration 2026_10_16_100000), and knows every one the application uses.
 * MySQL and MariaDB only; CI runs this on MySQL 8.
 */
class StatusConstraintsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            $this->markTestSkipped('CHECK constraints are added on MySQL and MariaDB only.');
        }
    }

    public function test_every_value_the_application_uses_is_allowed(): void
    {
        $used = [
            'boosts.status' => Boost::STATUSES,
            'boosts.boostable_type' => [Boost::PROFILE, Boost::PRODUCT],
            'campaign_participants.status' => CampaignParticipant::STATUSES,
            'conversation_blocks.blocked_by' => ['producer', 'buyer'],
            'favorites.favoritable_type' => ['producer', 'product'],
            'inquiry_outcomes.status' => array_keys(InquiryOutcome::STATUSES),
            'posts.type' => array_keys(Post::TYPES),
            'posts.status' => Post::STATUSES,
            'producer_certificates.type' => array_keys(ProducerCertificate::TYPES),
            'producer_certificates.status' => ProducerCertificate::STATUSES,
            'producer_change_requests.status' => ProducerChangeRequest::STATUSES,
            'producer_stats.event' => [ProducerStatistics::PROFILE_VIEW, ProducerStatistics::PRODUCT_VIEW, ...array_keys(ProducerStatistics::CLICKS)],
            'producer_subscriptions.status' => ProducerSubscription::STATUSES,
            'referrals.status' => array_keys(Referral::STATUS_LABELS),
            'reports.status' => Report::STATUSES,
            'reports.reportable_type' => Report::REPORTABLE,
            'reports.reason' => array_keys(Report::REASONS),
            'reviews.status' => Review::STATUSES,
            'wanted_ads.status' => WantedAd::STATUSES,
        ];

        $checks = collect(DB::select(
            'select constraint_name as name, check_clause as clause from information_schema.check_constraints where constraint_schema = ?',
            [DB::getDatabaseName()],
        ))->keyBy('name');

        $refused = [];

        foreach ($used as $column => $values) {
            $clause = $checks->get(str_replace('.', '_', $column).'_check')?->clause;
            $this->assertNotNull($clause, "No check on {$column}.");

            foreach ($values as $value) {
                if (! str_contains($clause, "'{$value}'")) {
                    $refused[] = "{$column}: {$value}";
                }
            }
        }

        $this->assertSame([], $refused, 'The application uses values the database would refuse; add them in a new migration.');
    }

    public function test_the_database_refuses_an_unknown_status(): void
    {
        $user = User::factory()->create();
        $ad = $user->wantedAds()->create(['title' => 'Med', 'body' => 'Bagremov.', 'status' => WantedAd::STATUS_OPEN, 'expires_at' => now()->addMonth()]);

        $this->expectException(QueryException::class);

        DB::table('wanted_ads')->where('id', $ad->id)->update(['status' => 'otvoren']);
    }
}
