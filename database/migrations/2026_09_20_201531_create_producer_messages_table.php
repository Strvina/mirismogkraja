<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Private messages between a buyer and a producer (task 8). A thread is
     * identified by the (producer, buyer) pair rather than its own table -
     * there's exactly one conversation per pair, so a separate conversations
     * table would only add a join. `sender_id` says which side wrote it.
     */
    public function up(): void
    {
        Schema::create('producer_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['household_id', 'buyer_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('producer_messages');
    }
};
