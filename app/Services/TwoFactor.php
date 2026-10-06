<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

/**
 * Two-step sign-in with an authenticator app (TOTP).
 *
 * Optional, and aimed at whoever can confirm payments and block accounts:
 * for them a leaked password should not be enough. Setting it up has two
 * steps on purpose - a secret is stored first and only counts once the
 * owner has typed a code from it, so nobody is locked out by a QR code they
 * never managed to scan.
 */
class TwoFactor
{
    private const RECOVERY_CODES = 8;

    /** How long a sign-in may wait at the code prompt before starting over. */
    public const CHALLENGE_MINUTES = 10;

    private const SESSION_KEY = 'two_factor.login';

    public function __construct(private readonly Google2FA $totp) {}

    /** Start setting up: a new secret, not yet in force. */
    public function begin(User $user): void
    {
        $user->forceFill([
            'two_factor_secret' => $this->totp->generateSecretKey(32),
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();
    }

    /** What the QR code holds: the secret, labelled with the site and the account. */
    public function otpauthUrl(User $user): string
    {
        return $this->totp->getQRCodeUrl(config('app.name'), $user->email, $user->two_factor_secret);
    }

    /**
     * Finish setting up with a code from the app. From here on signing in
     * asks for one. Returns the recovery codes, shown this once.
     *
     * @return list<string>|null null when the code is wrong
     */
    public function confirm(User $user, string $code): ?array
    {
        if ($user->two_factor_secret === null || ! $this->verify($user, $code)) {
            return null;
        }

        $user->forceFill(['two_factor_confirmed_at' => now()])->save();

        return $this->regenerateRecoveryCodes($user);
    }

    /**
     * Whether a six-digit code is the current one. A code is good once: the
     * time step it belongs to is remembered, so reading it over someone's
     * shoulder and typing it again inside the same half minute fails.
     */
    public function verify(User $user, string $code): bool
    {
        $code = preg_replace('/\s+/', '', $code);

        if ($user->two_factor_secret === null || ! preg_match('/^\d{6}$/', (string) $code)) {
            return false;
        }

        $key = 'two-factor:last-step:'.$user->id;
        $step = $this->totp->verifyKeyNewer($user->two_factor_secret, $code, Cache::get($key));

        if ($step === false) {
            return false;
        }

        // Long enough to outlive every step the check accepts.
        Cache::put($key, $step === true ? $this->totp->getTimestamp() : $step, now()->addMinutes(5));

        return true;
    }

    /** A recovery code, for a lost or replaced phone. Each works once. */
    public function useRecoveryCode(User $user, string $code): bool
    {
        $code = Str::lower(trim($code));
        $codes = $user->two_factor_recovery_codes ?? [];

        foreach ($codes as $index => $stored) {
            if (hash_equals($stored, $code)) {
                unset($codes[$index]);
                $user->forceFill(['two_factor_recovery_codes' => array_values($codes)])->save();

                return true;
            }
        }

        return false;
    }

    /**
     * Replace the recovery codes; the old ones stop working.
     *
     * @return list<string>
     */
    public function regenerateRecoveryCodes(User $user): array
    {
        $codes = array_map(
            fn () => Str::lower(Str::random(5).'-'.Str::random(5)),
            range(1, self::RECOVERY_CODES),
        );

        $user->forceFill(['two_factor_recovery_codes' => $codes])->save();

        return $codes;
    }

    public function disable(User $user): void
    {
        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();
    }

    /**
     * The password (or Google) was right, and a code is still owed: remember
     * who is signing in - without signing them in - and send them to the
     * prompt.
     */
    public function challenge(Request $request, User $user, bool $remember): RedirectResponse
    {
        $request->session()->put(self::SESSION_KEY, [
            'id' => $user->id,
            'remember' => $remember,
            'expires' => now()->addMinutes(self::CHALLENGE_MINUTES)->getTimestamp(),
        ]);

        return to_route('two-factor.challenge');
    }

    /**
     * Who is waiting at the prompt, if anyone still is.
     *
     * @return array{user: User, remember: bool}|null
     */
    public function pending(Request $request): ?array
    {
        $login = $request->session()->get(self::SESSION_KEY);

        if (! is_array($login) || ($login['expires'] ?? 0) < now()->getTimestamp()) {
            $request->session()->forget(self::SESSION_KEY);

            return null;
        }

        $user = User::find($login['id']);

        // Blocked, deleted or switched off since the password was typed.
        if ($user === null || $user->isBlocked() || ! $user->hasTwoFactor()) {
            $request->session()->forget(self::SESSION_KEY);

            return null;
        }

        return ['user' => $user, 'remember' => (bool) $login['remember']];
    }

    public function forgetPending(Request $request): void
    {
        $request->session()->forget(self::SESSION_KEY);
    }
}
