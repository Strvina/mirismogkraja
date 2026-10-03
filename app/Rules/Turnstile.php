<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Cloudflare Turnstile - the "you are a person" check on the public forms a
 * script would fill in by the thousand: registration and password reset.
 *
 * Off while no keys are configured (local work, the test suite). If
 * Cloudflare itself can't be reached the form goes through: a bot can't
 * cause that outage, and real people shouldn't be locked out by it - the
 * route throttles still hold either way.
 */
class Turnstile implements ValidationRule
{
    private const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    /** The form field the page sends the widget's token in. */
    public const FIELD = 'captcha';

    public static function enabled(): bool
    {
        return filled(config('services.turnstile.site_key')) && filled(config('services.turnstile.secret_key'));
    }

    /** What the page needs to show the widget, or null while the check is off. */
    public static function siteKey(): ?string
    {
        return self::enabled() ? config('services.turnstile.site_key') : null;
    }

    /**
     * Validation rules for the token field - none while the check is off.
     *
     * @return array<string, array<int, mixed>>
     */
    public static function rules(): array
    {
        return self::enabled() ? [self::FIELD => ['bail', 'required', 'string', 'max:2048', new self]] : [];
    }

    /** @return array<string, string> */
    public static function messages(): array
    {
        return [self::FIELD.'.required' => __('Potvrdite da niste robot.')];
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        try {
            $response = Http::asForm()->timeout(5)->post(self::VERIFY_URL, [
                'secret' => config('services.turnstile.secret_key'),
                'response' => $value,
                'remoteip' => request()->ip(),
            ]);
        } catch (ConnectionException $e) {
            Log::warning('Turnstile could not be reached; the form was let through.', ['error' => $e->getMessage()]);

            return;
        }

        if ($response->serverError()) {
            Log::warning('Turnstile answered with an error; the form was let through.', ['status' => $response->status()]);

            return;
        }

        if ($response->json('success') !== true) {
            $fail(__('Provera da niste robot nije uspela. Pokušajte ponovo.'));
        }
    }
}
