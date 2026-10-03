<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * What the site needs to work at all, in every environment, production
 * included: the roles, the product categories and the membership plans.
 * Every seeder here only adds what is missing, so running it again - on
 * each deploy, say - changes nothing that is already there.
 */
class ReferenceDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolesSeeder::class,
            CategoriesSeeder::class,
            SubscriptionPlansSeeder::class,
        ]);
    }
}
