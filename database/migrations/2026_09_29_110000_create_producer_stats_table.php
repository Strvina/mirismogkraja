<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Daily counters behind a producer's statistics (task 20.6).
 *
 * One row per producer, day, event and product - a view adds one to a row
 * rather than writing a row of its own, so the table grows with the number
 * of active days, not with traffic. Nothing about the visitor is kept.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('producer_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            // 0 for events about the producer as a whole. Not nullable, and
            // so not a foreign key: a unique index treats every NULL as
            // distinct, which would let the same day's row be written twice.
            $table->unsignedBigInteger('product_id')->default(0);
            $table->string('event', 20);
            $table->date('date');
            $table->unsignedInteger('hits')->default(0);

            // The write target, and - leading with the producer and the day -
            // the index the dashboard reads a date range through.
            $table->unique(['household_id', 'date', 'event', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('producer_stats');
    }
};
