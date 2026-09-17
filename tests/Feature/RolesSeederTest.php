<?php

namespace Tests\Feature;

use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RolesSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_roles_seeder_creates_buyer_seller_and_admin_roles()
    {
        $this->seed(RolesSeeder::class);

        $this->assertSame(
            ['admin', 'buyer', 'seller'],
            Role::pluck('name')->sort()->values()->toArray()
        );
    }

    public function test_roles_seeder_is_idempotent()
    {
        $this->seed(RolesSeeder::class);
        $this->seed(RolesSeeder::class);

        $this->assertSame(3, Role::count());
    }
}
