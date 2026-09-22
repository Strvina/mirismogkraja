<?php

namespace Tests\Feature;

use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function askedWithoutAnswer(User $buyer, Producer $producer): void
    {
        ProducerMessage::create([
            'household_id' => $producer->id,
            'buyer_id' => $buyer->id,
            'sender_id' => $buyer->id,
            'body' => 'Pitanje',
        ]);
    }

    private function answeredConversation(User $buyer, Producer $producer): void
    {
        $this->askedWithoutAnswer($buyer, $producer);

        ProducerMessage::create([
            'household_id' => $producer->id,
            'buyer_id' => $buyer->id,
            'sender_id' => $producer->user_id,
            'body' => 'Odgovor',
        ]);
    }

    public function test_buyer_the_producer_replied_to_can_review_them()
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->create();
        $this->answeredConversation($buyer, $producer);

        $this->assertTrue($buyer->can('create', [Review::class, $producer]));
    }

    public function test_buyer_who_never_contacted_the_producer_cannot_review()
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->create();

        $this->assertFalse($buyer->can('create', [Review::class, $producer]));
    }

    public function test_an_unanswered_question_is_not_enough_to_review()
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->create();
        $this->askedWithoutAnswer($buyer, $producer);

        $this->assertFalse($buyer->can('create', [Review::class, $producer]));
    }

    public function test_a_producer_cannot_review_themselves()
    {
        $owner = User::factory()->create();
        $producer = Producer::factory()->for($owner)->create();
        $this->answeredConversation($owner, $producer);

        $this->assertFalse($owner->can('create', [Review::class, $producer]));
    }

    public function test_buyer_cannot_review_the_same_producer_twice()
    {
        $buyer = User::factory()->create();
        $producer = Producer::factory()->create();
        $this->answeredConversation($buyer, $producer);
        Review::factory()->for($buyer)->for($producer)->create();

        $this->assertFalse($buyer->can('create', [Review::class, $producer]));
    }

    public function test_only_the_author_can_update_or_delete_their_review()
    {
        $author = User::factory()->create();
        $stranger = User::factory()->create();
        $review = Review::factory()->for($author)->create();

        $this->assertTrue($author->can('update', $review));
        $this->assertFalse($stranger->can('update', $review));
        $this->assertTrue($author->can('delete', $review));
        $this->assertFalse($stranger->can('delete', $review));
    }
}
