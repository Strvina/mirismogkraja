<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RolesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach (['buyer', 'seller', 'admin'] as $role) {
            Role::firstOrCreate(['name' => $role]);
        }
    }
}
