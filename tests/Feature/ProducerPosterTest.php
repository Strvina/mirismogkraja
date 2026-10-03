<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\User;
use App\Services\ProducerPosterPdf;
use App\Services\ProducerStatistics;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProducerPosterTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_owner_downloads_a_poster_pdf_for_a_public_producer(): void
    {
        $producer = Producer::factory()->active()->create(['name' => 'Pčelarstvo Đorđević', 'slug' => 'pcelarstvo-djordjevic']);

        $this->actingAs($producer->user)->get(route('producers.poster', $producer))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf')
            ->assertHeader('Content-Disposition', 'attachment; filename="poster-pcelarstvo-djordjevic.pdf"');

        $this->assertStringContainsString('izvor=qr', ProducerPosterPdf::url($producer));
    }

    public function test_nobody_else_gets_it_and_not_before_approval(): void
    {
        $producer = Producer::factory()->active()->create();
        $pending = Producer::factory()->create(['status' => 'pending']);

        $this->actingAs(User::factory()->create())->get(route('producers.poster', $producer))->assertForbidden();
        $this->actingAs($pending->user)->get(route('producers.poster', $pending))->assertForbidden();
    }

    public function test_a_visit_from_the_qr_code_is_counted(): void
    {
        $producer = Producer::factory()->active()->create();

        $this->withHeader('User-Agent', 'Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile')
            ->get(ProducerPosterPdf::url($producer))
            ->assertOk();

        $this->assertSame(1, (int) DB::table('producer_stats')->where('producer_id', $producer->id)->where('event', ProducerStatistics::QR_SCAN)->sum('hits'));
    }
}
