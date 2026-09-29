<?php

namespace Tests\Feature;

use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class LocalizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_visitor_language_is_detected_from_the_browser(): void
    {
        $this->withHeader('Accept-Language', 'ru-RU,ru;q=0.9,en;q=0.8')->get('/')
            ->assertInertia(fn ($page) => $page->where('locale', 'ru'));

        $this->withHeader('Accept-Language', 'hr-HR,hr;q=0.9')->get('/')
            ->assertInertia(fn ($page) => $page->where('locale', 'sr'));

        $this->withHeader('Accept-Language', 'de-DE,de;q=0.9')->get('/')
            ->assertInertia(fn ($page) => $page->where('locale', 'en'));
    }

    public function test_a_chosen_language_wins_over_the_browser(): void
    {
        $this->get(route('locale', 'en'))
            ->assertRedirect()
            ->assertCookie(SetLocale::COOKIE, 'en', encrypted: false);

        $this->withUnencryptedCookie(SetLocale::COOKIE, 'en')
            ->withHeader('Accept-Language', 'ru')
            ->get('/')
            ->assertInertia(fn ($page) => $page->where('locale', 'en'));
    }

    public function test_an_unsupported_language_is_rejected(): void
    {
        $this->get('/jezik/de')->assertNotFound();
    }

    public function test_switching_language_never_redirects_off_site(): void
    {
        $this->withHeader('Referer', 'http://localhost.evil.test/phish')
            ->get(route('locale', 'ru'))
            ->assertRedirect(url('/'));
    }

    public function test_server_messages_follow_the_language(): void
    {
        $this->withHeader('Accept-Language', 'ru')
            ->post(route('login'), ['email' => 'nobody@example.com', 'password' => 'wrong-password'])
            ->assertSessionHasErrors(['email' => trans('auth.failed', [], 'ru')]);
    }

    /**
     * Serbian strings are the keys, so a string missing from a dictionary
     * silently falls back to Serbian. Every key used in the code must be in
     * both dictionaries.
     */
    public function test_every_translation_key_has_an_english_and_russian_entry(): void
    {
        $keys = [];

        foreach (File::allFiles(resource_path('js')) as $file) {
            preg_match_all("/(?<![\\w.\$])tx?\\(\\s*'((?:[^'\\\\]|\\\\.)*)'/s", $file->getContents(), $matches);
            array_push($keys, ...$matches[1]);
        }

        foreach ([app_path(), resource_path('views')] as $directory) {
            foreach (File::allFiles($directory) as $file) {
                preg_match_all("/(?<![\\w>])__\\(\\s*'((?:[^'\\\\]|\\\\.)*)'/s", $file->getContents(), $matches);
                array_push($keys, ...array_filter($matches[1], fn (string $key) => ! preg_match('/^[\w]+\.[\w.]+$/', $key)));
            }
        }

        $keys = array_unique(array_map(fn (string $key) => str_replace("\\'", "'", $key), $keys));
        $this->assertNotEmpty($keys);

        foreach (['en', 'ru'] as $locale) {
            $dictionary = json_decode(File::get(lang_path("{$locale}.json")), true, flags: JSON_THROW_ON_ERROR);
            $missing = array_values(array_diff($keys, array_keys($dictionary)));

            $this->assertSame([], $missing, "Missing from lang/{$locale}.json");
        }
    }
}
