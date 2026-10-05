<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Gde me nađete": the markets, fairs and shops where a producer sells in
 * person, and on which days. Most buyers of home-made food still meet the
 * producer at a stall, so the page says where and when.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('producer_markets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producer_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('city', 80)->nullable();
            // ISO weekdays, 1 (Monday) to 7 (Sunday). A short list read as a
            // whole with its row; nothing filters by day.
            $table->json('days');
            $table->time('opens_at')->nullable();
            $table->time('closes_at')->nullable();
            $table->string('note', 160)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('producer_markets');
    }
};
