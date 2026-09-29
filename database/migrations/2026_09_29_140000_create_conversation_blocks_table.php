<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A producer refusing further messages from one buyer (task 21: "zaštita od
 * spama u sistemu poruka"). The rate limit on sending stops a flood; this
 * stops one person who will not take no for an answer.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversation_blocks', function (Blueprint $table) {
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->primary(['household_id', 'buyer_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_blocks');
    }
};
