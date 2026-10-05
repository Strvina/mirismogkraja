<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Certificates and other documents a producer can show for what they claim:
 * organic certification, protected origin, a registered farm, an award.
 *
 * The document itself is seen only by the producer and an admin; the public
 * page shows the claim once an admin has checked the document behind it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('producer_certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producer_id')->constrained()->cascadeOnDelete();
            $table->string('type', 30);
            $table->string('title', 120);
            $table->string('issuer', 120)->nullable();
            $table->date('issued_on')->nullable();
            $table->date('expires_on')->nullable();
            // On the private disk, never under public/.
            $table->string('file_path');
            $table->string('status', 20)->default('pending');
            $table->string('rejection_reason')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            // A producer's page reads its approved ones; the admin queue
            // reads one status, oldest first.
            $table->index(['producer_id', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('producer_certificates');
    }
};
