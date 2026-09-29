<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_response_carries_the_security_headers(): void
    {
        foreach (['/', '/sitemap.xml', '/does-not-exist'] as $url) {
            $this->get($url)
                ->assertHeader('X-Content-Type-Options', 'nosniff')
                ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
                ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        }
    }

    /** HSTS over plain HTTP would pin a local setup to a scheme it lacks. */
    public function test_hsts_is_only_sent_over_https(): void
    {
        $this->get('/')->assertHeaderMissing('Strict-Transport-Security');
        $this->get('https://localhost/')->assertHeader('Strict-Transport-Security');
    }

    public function test_registration_is_rate_limited(): void
    {
        foreach (range(1, 6) as $attempt) {
            $this->post('/register', ['email' => 'nije-ispravan'])->assertStatus(302);
        }

        $this->post('/register', ['email' => 'nije-ispravan'])->assertStatus(429);
    }
}
