<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stories and recipes a producer writes: how the cheese is made, what to
 * cook with the ajvar. Each is a page of its own that search engines can
 * find and people can share, and it leads back to the producer.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producer_id')->constrained()->cascadeOnDelete();
            $table->string('type', 10);
            $table->string('title', 150);
            $table->string('slug')->unique();
            $table->string('excerpt', 300)->nullable();
            $table->text('body');
            // Recipes only: one ingredient per line.
            $table->text('ingredients')->nullable();
            $table->string('cover_image_path')->nullable();
            // The product a story is about or a recipe is cooked with.
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 10)->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            // The public list: published, newest first.
            $table->index(['status', 'published_at']);
            // A producer's own list and their page's "latest".
            $table->index(['producer_id', 'status', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
