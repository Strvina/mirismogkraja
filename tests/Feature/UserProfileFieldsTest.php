<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserProfileFieldsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_profile_fields_are_mass_assignable_and_persist()
    {
        $user = User::factory()->create([
            'phone' => '+381601234567',
            'avatar_path' => 'avatars/1.jpg',
            'address' => 'Bulevar oslobođenja 1',
            'city' => 'Leskovac',
            'lat' => 42.998,
            'lng' => 21.9461,
        ]);

        $user->refresh();

        $this->assertSame('+381601234567', $user->phone);
        $this->assertSame('avatars/1.jpg', $user->avatar_path);
        $this->assertSame('Bulevar oslobođenja 1', $user->address);
        $this->assertSame('Leskovac', $user->city);
        $this->assertEquals(42.998, (float) $user->lat);
        $this->assertEquals(21.9461, (float) $user->lng);
    }

    public function test_user_profile_fields_default_to_null()
    {
        $user = User::factory()->create();

        $this->assertNull($user->phone);
        $this->assertNull($user->avatar_path);
        $this->assertNull($user->address);
        $this->assertNull($user->city);
        $this->assertNull($user->lat);
        $this->assertNull($user->lng);
    }
}
