<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\PaymentSlipService;
use App\Services\SubscriptionService;
use App\Support\Settings;
use Database\Seeders\SubscriptionPlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The payment slip and the QR code beside it are built from the same values.
 * If they drifted apart, money would arrive with a reference nobody can
 * match to a producer - which is the one thing a manual payment flow cannot
 * survive.
 */
class PaymentSlipTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SubscriptionPlansSeeder::class);

        app(Settings::class)->put([
            'payment.recipient' => 'Vrelina juga',
            'payment.address' => 'Niš',
            'payment.account' => '160-123456789012-51',
            'payment.purpose' => 'Članarina',
            'payment.model' => '97',
            'payment.code' => '221',
        ]);
    }

    public function test_the_qr_payload_follows_the_ips_format(): void
    {
        $owner = User::factory()->create(['name' => 'Milica Nikolić']);
        $producer = Producer::factory()->for($owner)->active()->create(['name' => 'Mlekara Zapis']);
        $subscription = app(SubscriptionService::class)->request($producer, SubscriptionPlan::where('slug', 'premium')->sole());

        $payload = app(PaymentSlipService::class)->qrPayload($subscription);

        $this->assertStringStartsWith('K:PR|V:01|C:1|', $payload);
        // Eighteen bare digits, no separators: bank code, the account
        // padded to thirteen, then the check digits.
        $this->assertStringContainsString('|R:160012345678901251|', $payload);
        $this->assertStringContainsString('|I:RSD5990,00|', $payload);
        $this->assertStringContainsString('|N:Vrelina juga', $payload);
        // The person signs the slip, not the business they registered...
        $this->assertStringContainsString('|P:Milica Nikolić|', $payload);
        // ...and the business is named in the purpose instead, which is
        // where the payee reads what the money is for.
        $this->assertStringContainsString('|S:Članarina - Mlekara Zapis|', $payload);
        $this->assertStringContainsString('|SF:221|', $payload);
        $this->assertStringContainsString('|RO:97'.str_replace('-', '', $subscription->reference), $payload);
    }

    /**
     * A reference may hold only digits and dashes, and under model 97 its
     * first two digits are a MOD 97-10 check over the rest - a bank rejects
     * anything else, and a banking app refuses the QR.
     */
    public function test_the_reference_is_valid_under_model_97(): void
    {
        $producer = Producer::factory()->active()->create();
        $reference = app(SubscriptionService::class)->request($producer, SubscriptionPlan::where('slug', 'basic')->sole())->reference;

        $this->assertMatchesRegularExpression('/^\d{2}-\d{8}$/', $reference);

        [$control, $base] = explode('-', $reference);
        // The standard check: the base followed by its control digits
        // leaves a remainder of one.
        $this->assertSame(1, (int) ($base.$control) % 97);
    }

    /**
     * The IPS standard caps the purpose at 35 characters and the names at
     * 70; a banking app refuses a code that runs over. The printed slip
     * keeps the whole purpose.
     */
    public function test_qr_fields_keep_to_the_ips_limits(): void
    {
        $owner = User::factory()->create(['name' => str_repeat('Dugo Ime ', 12)]);
        $producer = Producer::factory()->for($owner)->active()->create(['name' => 'Poljoprivredno gazdinstvo Stanković i sinovi']);
        $subscription = app(SubscriptionService::class)->request($producer, SubscriptionPlan::where('slug', 'basic')->sole());

        $details = app(PaymentSlipService::class)->detailsFor($subscription);
        $fields = collect(explode('|', $details['qr']))->mapWithKeys(fn (string $field) => [strstr($field, ':', true) => substr(strstr($field, ':'), 1)]);

        $this->assertLessThanOrEqual(35, mb_strlen($fields['S']));
        $this->assertLessThanOrEqual(70, mb_strlen($fields['P']));
        $this->assertStringContainsString('Stanković i sinovi', $details['purpose']);
    }

    /** What is printed and what is scanned have to be the same money. */
    public function test_the_printed_amount_and_reference_match_the_qr(): void
    {
        $producer = Producer::factory()->active()->create();
        $subscription = app(SubscriptionService::class)->request($producer, SubscriptionPlan::where('slug', 'pro')->sole());

        $details = app(PaymentSlipService::class)->detailsFor($subscription);

        $this->assertSame('9.990,00', $details['amount']);
        $this->assertSame($subscription->reference, $details['reference']);
        $this->assertStringContainsString('I:RSD9990,00', $details['qr']);
        $this->assertStringContainsString(str_replace('-', '', $subscription->reference), $details['qr']);
    }

    /** A pipe would split a field in two and corrupt everything after it. */
    public function test_a_pipe_in_a_name_cannot_break_the_payload(): void
    {
        $owner = User::factory()->create(['name' => 'Ime|sa crtom']);
        $producer = Producer::factory()->for($owner)->active()->create();
        $subscription = app(SubscriptionService::class)->request($producer, SubscriptionPlan::where('slug', 'basic')->sole());

        $payload = app(PaymentSlipService::class)->qrPayload($subscription);

        $this->assertSame(10, count(explode('|', $payload)));
        $this->assertStringContainsString('P:Ime sa crtom', $payload);
    }

    public function test_the_membership_page_carries_the_whole_slip(): void
    {
        $producer = Producer::factory()->active()->create();
        app(SubscriptionService::class)->request($producer, SubscriptionPlan::where('slug', 'basic')->sole());

        $this->actingAs($producer->user)->get(route('memberships.index'))->assertInertia(
            fn ($page) => $page->has('producers.0.pending.slip.qr')
                ->where('producers.0.pending.slip.account', '160-123456789012-51')
                ->has('producers.0.pending.slip.reference')
        );
    }

    public function test_the_slip_downloads_as_a_pdf(): void
    {
        $producer = Producer::factory()->active()->create();
        $subscription = app(SubscriptionService::class)->request($producer, SubscriptionPlan::where('slug', 'basic')->sole());

        $response = $this->actingAs($producer->user)->get(route('memberships.slip', $subscription));

        $response->assertOk()
            ->assertHeader('content-type', 'application/pdf')
            ->assertHeader('content-disposition', 'attachment; filename="uplatnica-'.$subscription->reference.'.pdf"');

        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }

    public function test_a_stranger_cannot_download_someone_elses_slip(): void
    {
        $producer = Producer::factory()->active()->create();
        $subscription = app(SubscriptionService::class)->request($producer, SubscriptionPlan::where('slug', 'basic')->sole());

        $this->actingAs(User::factory()->create())->get(route('memberships.slip', $subscription))->assertForbidden();
    }
}
