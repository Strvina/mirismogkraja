<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Task 21: because the platform is not a party to the sale, buyers need
     * some way to tell someone when a producer takes money and sends
     * nothing, or never answers - and producers need the same against a
     * buyer who abuses the message thread. Without it the only lever anyone
     * has is a public review, which punishes before anyone has looked.
     *
     * Verification is the other half of the same trust problem: a badge an
     * admin sets by hand after checking who the producer actually is.
     */
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reported_by')->constrained('users')->cascadeOnDelete();
            // Producer, product or user - stored through the morph map, so
            // the stored type survives a class being moved or renamed.
            $table->morphs('reportable');
            $table->string('reason');
            $table->text('message')->nullable();
            $table->string('status')->default('open');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            // The admin queue reads open reports, oldest first.
            $table->index(['status', 'created_at']);
            // One report per person per thing: a second one replaces the
            // first rather than flooding the queue.
            $table->unique(['reported_by', 'reportable_type', 'reportable_id']);
        });

        Schema::table('households', function (Blueprint $table) {
            $table->timestamp('verified_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');

        Schema::table('households', function (Blueprint $table) {
            $table->dropColumn('verified_at');
        });
    }
};
