<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\User;
use Tests\TestCase;

/**
 * The privacy policy says how long each kind of data is kept
 * (resources/js/pages/legal/privacy.tsx, "Koliko dugo čuvamo"). The numbers
 * live in the code and the configuration; when one of them changes here,
 * the sentence a visitor reads has to change with it.
 */
class RetentionPolicyTest extends TestCase
{
    public function test_the_periods_the_privacy_policy_names_are_the_ones_in_force(): void
    {
        // Not in the Docker image, which ships the application and not the
        // deployment's files; the suite runs in a checkout everywhere else.
        if (! is_file($example = base_path('deploy/env.production.example'))) {
            $this->markTestSkipped('deploy/ is not part of this copy of the application.');
        }

        $production = file_get_contents($example);

        // "Posle dva sata bez aktivnosti prijava ističe."
        $this->assertStringContainsString("\nSESSION_LIFETIME=120\n", $production);
        // "Zapis o izmenama: dvanaest meseci."
        $this->assertSame(12, ActivityLog::KEEP_MONTHS);
        // "Rezervne kopije baze: četrnaest dana."
        $this->assertStringContainsString("\nBACKUP_KEEP_DAYS=14\n", $production);
        // "Tehnički zapis grešaka: četrnaest dana", in the daily log.
        $this->assertStringContainsString("\nLOG_CHANNEL=daily\n", $production);
        $this->assertSame(14, (int) config('logging.channels.daily.days'));
        // "Ime, telefon, adresa, grad, lokacija i profilna slika brišu se odmah."
        $this->assertEqualsCanonicalizing(['name', 'phone', 'address', 'city', 'lat', 'lng', 'avatar_path'], array_keys(User::ANONYMISED));
    }
}
