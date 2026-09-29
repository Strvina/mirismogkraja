<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Proizvođač nedelje" (task 20.7): the producer, and optionally one of
 * their products, shown in a slot of their own on the homepage for a week.
 *
 * Rows are kept after their week is over - the history is what stops the
 * same producer being picked too often.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weekly_picks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            // Always a Monday; one pick per week.
            $table->date('starts_on')->unique();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            // "When was this producer last picked?"
            $table->index(['household_id', 'starts_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_picks');
    }
};
