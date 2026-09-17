<?php

namespace Tests\Feature;

use App\Models\Household;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HouseholdModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_household_belongs_to_a_user()
    {
        $user = User::factory()->create();
        $household = Household::factory()->for($user)->create();

        $this->assertTrue($household->user->is($user));
    }

    public function test_user_can_have_many_households()
    {
        $user = User::factory()->create();
        Household::factory()->for($user)->count(2)->create();

        $this->assertCount(2, $user->households);
    }

    public function test_household_defaults_to_pending_status()
    {
        $household = Household::factory()->create();

        $this->assertSame('pending', $household->status);
    }
}
