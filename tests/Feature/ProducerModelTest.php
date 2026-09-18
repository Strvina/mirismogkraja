<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProducerModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_producer_belongs_to_a_user()
    {
        $user = User::factory()->create();
        $producer = Producer::factory()->for($user)->create();

        $this->assertTrue($producer->user->is($user));
    }

    public function test_user_can_have_many_producers()
    {
        $user = User::factory()->create();
        Producer::factory()->for($user)->count(2)->create();

        $this->assertCount(2, $user->producers);
    }

    public function test_producer_defaults_to_pending_status()
    {
        $producer = Producer::factory()->create();

        $this->assertSame('pending', $producer->status);
    }
}
