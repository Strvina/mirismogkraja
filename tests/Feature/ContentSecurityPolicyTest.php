<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Vite;
use Tests\TestCase;

class ContentSecurityPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_page_allows_only_its_own_scripts_and_those_carrying_its_nonce(): void
    {
        $response = $this->get('/')->assertOk();
        $policy = (string) $response->headers->get('Content-Security-Policy');

        $this->assertMatchesRegularExpression("/script-src 'self' 'nonce-([A-Za-z0-9]+)' https:\\/\\/challenges\\.cloudflare\\.com/", $policy);
        preg_match("/'nonce-([A-Za-z0-9]+)'/", $policy, $match);

        // Every inline script on the page - Ziggy's route list among them -
        // carries this response's nonce.
        preg_match_all('/<script(?![^>]*\bsrc=)([^>]*)>/', $response->getContent(), $scripts);
        $this->assertNotEmpty($scripts[1]);
        foreach ($scripts[1] as $attributes) {
            $this->assertStringContainsString('nonce="'.$match[1].'"', $attributes);
        }

        foreach (["object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'", 'https://tile.openstreetmap.org'] as $part) {
            $this->assertStringContainsString($part, $policy);
        }
    }

    public function test_each_page_gets_a_fresh_nonce(): void
    {
        $first = $this->get('/')->headers->get('Content-Security-Policy');
        $second = $this->get('/')->headers->get('Content-Security-Policy');

        $this->assertNotSame($first, $second);
    }

    public function test_the_policy_can_be_sent_as_report_only(): void
    {
        config(['app.csp_report_only' => true]);

        $this->get('/')
            ->assertHeaderMissing('Content-Security-Policy')
            ->assertHeader('Content-Security-Policy-Report-Only');
    }

    /** Vite's dev server can sit at an address a policy cannot name, so locally it only reports. */
    public function test_with_the_vite_dev_server_running_it_only_reports(): void
    {
        $hot = tempnam(sys_get_temp_dir(), 'hot');
        file_put_contents($hot, 'http://[::1]:5173');
        Vite::useHotFile($hot);

        try {
            $this->get('/')
                ->assertHeaderMissing('Content-Security-Policy')
                ->assertHeader('Content-Security-Policy-Report-Only');
        } finally {
            unlink($hot);
        }
    }

    public function test_a_file_that_is_not_a_page_gets_no_policy(): void
    {
        $this->get('/robots.txt')->assertHeaderMissing('Content-Security-Policy');
    }

    public function test_the_health_check_fails_when_the_database_does_not_answer(): void
    {
        $this->get('/up')->assertOk();

        $working = config('database.default');
        config(['database.connections.broken' => ['driver' => 'sqlite', 'database' => '/no/such/dir/x.sqlite', 'prefix' => '']]);
        config(['database.default' => 'broken']);

        try {
            $this->get('/up')->assertStatus(500);
        } finally {
            config(['database.default' => $working]);
            DB::purge('broken');
        }
    }
}
