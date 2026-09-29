<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What came of an inquiry, as the producer reports it (task 14, point 5).
 *
 * Self-reported and unverifiable by design: the platform never sees the
 * sale. It is the producer's own record, and the admin's rough picture of
 * what sells - never a basis for anything owed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inquiry_outcomes', function (Blueprint $table) {
            // A thread is a (producer, buyer) pair, so that is the key.
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 20);
            // The product the thread was opened about, if any - what the
            // "sold most" summary counts.
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('updated_at')->useCurrent();

            $table->primary(['household_id', 'buyer_id']);
            // The admin summary: one status, this month.
            $table->index(['status', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inquiry_outcomes');
    }
};
