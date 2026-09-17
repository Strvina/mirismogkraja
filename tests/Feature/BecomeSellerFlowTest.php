<?php

namespace Tests\Feature;

use App\Models\Household;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BecomeSellerFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesSeeder::class);
    }

    public function test_creating_a_household_grants_the_seller_role()
    {
        $user = User::factory()->create();
        $user->assignRole('buyer');

        $this->actingAs($user)->post(route('households.store'), ['name' => 'Domaćinstvo Nićić']);

        $this->assertTrue($user->fresh()->hasRole('seller'));
        $this->assertTrue($user->fresh()->hasRole('buyer'));
    }

    public function test_creating_a_second_household_does_not_duplicate_the_seller_role()
    {
        $user = User::factory()->create();
        $user->assignRole(['buyer', 'seller']);
        Household::factory()->for($user)->create();

        $this->actingAs($user)->post(route('households.store'), ['name' => 'Drugo domaćinstvo']);

        $this->assertCount(2, $user->fresh()->roles);
    }
}
