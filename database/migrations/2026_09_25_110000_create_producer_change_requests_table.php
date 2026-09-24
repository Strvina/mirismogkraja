<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Task 15 draws a line through a producer's own fields: the ones an owner
     * keeps current - description, story, contact, delivery, images, and
     * everything about their products - they change themselves, immediately.
     *
     * The name is different. It is what an admin approved, what buyers
     * recognise and what the public URL is built from, so renaming an
     * already-published producer is a request rather than an edit: the
     * producer stays online under the approved name until someone says yes.
     *
     * A producer that is still pending or blocked has nothing published to
     * protect, so its owner renames it directly.
     */
    public function up(): void
    {
        Schema::create('producer_change_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
            $table->string('field');
            $table->text('current_value')->nullable();
            $table->text('requested_value');
            $table->string('status')->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            // The admin queue reads pending rows, oldest first.
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('producer_change_requests');
    }
};
