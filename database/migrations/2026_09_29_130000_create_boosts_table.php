<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Paid boosts (task 20.2): a producer's profile or one of their products
 * shown in the labelled "Istaknuto" row for a few days, paid by bank slip
 * like a membership.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('boosts', function (Blueprint $table) {
            $table->id();
            // The paying producer, whichever of their things is boosted -
            // what their own page and the slip are read through.
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            // 'household' or 'product', through the morph map.
            $table->morphs('boostable');
            $table->string('status')->default('pending_payment');
            $table->string('reference')->unique();
            $table->unsignedInteger('amount_rsd');
            // Fixed when it is asked for, so a later price change does not
            // alter what was already paid for.
            $table->unsignedSmallInteger('days');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            // The listings: which boosts of a kind are running now.
            $table->index(['boostable_type', 'status', 'ends_at']);
            // The producer's page and the admin queue.
            $table->index(['household_id', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('boosts');
    }
};
