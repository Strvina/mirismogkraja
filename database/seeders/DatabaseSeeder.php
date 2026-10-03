<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * `php artisan db:seed`.
 *
 * Everywhere: the reference data (ReferenceDataSeeder). Only on a
 * developer's machine and in the test suite: the demo producers, products
 * and conversations, and the demo accounts with their well-known passwords
 * (admin@gmail.com / admin, test@example.com / password) - which on a live
 * site would hand the admin panel to anyone who has read this file.
 */
class DatabaseSeeder extends Seeder
{
    /** Where demo content may be seeded. Anything else - production, staging - gets only the reference data. */
    public const DEMO_ENVIRONMENTS = ['local', 'testing'];

    public function run(): void
    {
        $this->call(ReferenceDataSeeder::class);

        if (! app()->environment(self::DEMO_ENVIRONMENTS)) {
            $this->command?->info('Demo content and demo accounts skipped outside a local setup. Create the administrator with: php artisan admin:create');

            return;
        }

        $this->call(DemoContentSeeder::class);

        User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
            ]
        );
    }
}
