<?php

use App\Models\Conversation;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A row per conversation, kept beside the messages (see App\Models\Conversation),
 * filled from the messages already written.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('last_message_id')->nullable()->constrained('producer_messages')->nullOnDelete();
            $table->unsignedInteger('unread_by_producer')->default(0);
            $table->unsignedInteger('unread_by_buyer')->default(0);
            $table->timestamps();

            $table->unique(['producer_id', 'buyer_id']);
            // The inbox from each side, newest conversation first.
            $table->index(['buyer_id', 'last_message_id']);
            $table->index(['producer_id', 'last_message_id']);
        });

        Conversation::rebuild();
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
