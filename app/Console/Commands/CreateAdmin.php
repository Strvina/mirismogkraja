<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;

use function Laravel\Prompts\confirm;
use function Laravel\Prompts\password;
use function Laravel\Prompts\text;

/**
 * The first administrator of a live site - which the seeders deliberately
 * do not create (see DatabaseSeeder) - or making an existing account one.
 * The password is typed at a hidden prompt, never passed as an argument,
 * so it stays out of the shell history.
 */
class CreateAdmin extends Command
{
    protected $signature = 'admin:create {email? : The administrator\'s e-mail address}';

    protected $description = 'Create an administrator account, or make an existing account an administrator';

    private const MIN_PASSWORD = 12;

    public function handle(): int
    {
        $email = strtolower(trim((string) ($this->argument('email') ?? text(
            label: 'E-mail',
            required: true,
            validate: fn (string $value) => $this->invalidEmail($value),
        ))));

        if ($error = $this->invalidEmail($email)) {
            $this->error($error);

            return self::FAILURE;
        }

        $role = Role::firstOrCreate(['name' => 'admin']);
        $existing = User::where('email', $email)->first();

        if ($existing) {
            if ($existing->hasRole($role)) {
                $this->info("{$email} is already an administrator.");

                return self::SUCCESS;
            }

            if (! confirm("{$email} already has an account. Make it an administrator?", default: false)) {
                return self::FAILURE;
            }

            $existing->assignRole($role);
            $this->info("{$email} is now an administrator.");

            return self::SUCCESS;
        }

        $name = text(label: 'Name', required: true);
        $password = password(
            label: 'Password (at least '.self::MIN_PASSWORD.' characters)',
            required: true,
            validate: fn (string $value) => mb_strlen($value) < self::MIN_PASSWORD ? 'At least '.self::MIN_PASSWORD.' characters.' : null,
        );

        $user = User::create(['name' => $name, 'email' => $email, 'password' => Hash::make($password)]);
        // Nobody is going to click a link to confirm the owner's own address.
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->assignRole($role);

        $this->info("Administrator {$email} created. Sign in at ".route('login'));

        return self::SUCCESS;
    }

    private function invalidEmail(string $value): ?string
    {
        return Validator::make(['email' => $value], ['email' => ['required', 'email', 'max:255']])->fails()
            ? 'That is not a valid e-mail address.'
            : null;
    }
}
