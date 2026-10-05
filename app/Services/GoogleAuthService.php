<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Two\User as GoogleUser;

/**
 * Turning "Google says this is who they are" into an account on the site.
 *
 * Three cases: an account already tied to this Google account, an account
 * with the same e-mail that is tied to it now, or a new account. Each is
 * safe only because of one rule - the address must be one Google itself has
 * verified - so that rule comes first.
 */
class GoogleAuthService
{
    /** Offered only when both keys are set (see config/services.php). */
    public static function enabled(): bool
    {
        return filled(config('services.google.client_id')) && filled(config('services.google.client_secret'));
    }

    /**
     * @return array{0: User, 1: bool} the account, and whether it was just created
     *
     * @throws ValidationException with the sentence to show on the sign-in page
     */
    public function resolve(GoogleUser $google): array
    {
        $id = (string) $google->getId();
        $email = Str::lower(trim((string) $google->getEmail()));

        // Without this, anyone could put someone else's address on a Google
        // account and be signed in as them here.
        if ($id === '' || $email === '' || ($google->getRaw()['email_verified'] ?? false) !== true) {
            $this->fail(__('Google nalog nema potvrđenu e-mail adresu, pa ne možemo da vas prijavimo preko njega.'));
        }

        $user = User::where('google_id', $id)->first();
        $created = false;

        if ($user === null) {
            $user = User::where('email', $email)->first();

            if ($user !== null) {
                $this->link($user, $id);
            } else {
                $user = $this->create($google, $id, $email);
                $created = true;
            }
        }

        if ($user->isBlocked()) {
            $this->fail(__('Ovaj nalog je blokiran.'));
        }

        return [$user, $created];
    }

    /** Tie an existing account, found by its e-mail, to the Google account. */
    private function link(User $user, string $googleId): void
    {
        // Already tied to a different Google account: not this person's.
        if ($user->google_id !== null) {
            $this->fail(__('Ovaj nalog je povezan sa drugim Google nalogom. Prijavite se e-mailom i lozinkom.'));
        }

        $attributes = ['google_id' => $googleId];

        // The address was never confirmed, so whoever opened this account
        // may not be the person who owns it - someone can register with a
        // stranger's e-mail and wait. Google has now shown who the owner is:
        // the account becomes theirs, and the password set by whoever opened
        // it stops working, along with any session still signed in with it.
        if (! $user->hasVerifiedEmail()) {
            $attributes += ['email_verified_at' => now(), 'password' => null, 'remember_token' => null];

            if (config('session.driver') === 'database') {
                DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)->delete();
            }
        }

        $user->forceFill($attributes)->save();
    }

    private function create(GoogleUser $google, string $googleId, string $email): User
    {
        $name = trim((string) $google->getName()) ?: Str::before($email, '@');

        $user = new User(['name' => Str::limit($name, 250, ''), 'email' => $email]);
        // No password: the account is opened by Google, and its owner can
        // set one later. Verified, because Google has verified the address.
        $user->forceFill(['google_id' => $googleId, 'email_verified_at' => now()])->save();
        $user->assignRole('buyer');

        return $user;
    }

    /** @throws ValidationException */
    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['email' => $message]);
    }
}
