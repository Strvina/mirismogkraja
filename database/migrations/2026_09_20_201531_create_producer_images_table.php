<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Gallery of a producer's place and production (task 8), kept separate
     * from product images. The caption is what lets the same gallery double
     * as the "how it's made" story strip.
     */
    public function up(): void
    {
        Schema::create('producer_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('caption')->nullable();
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();

            $table->index(['household_id', 'order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('producer_images');
    }
};
