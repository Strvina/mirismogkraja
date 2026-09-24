<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Task 20.4 and 20.5 - the two parts of the monetisation plan that carry
     * no money: the founding hundred, and following a producer.
     *
     * The founding number is permanent and never reissued, so it is stored
     * on the producer rather than derived from a count at read time; a
     * producer that is later hidden or archived keeps its place in the
     * history either way.
     */
    public function up(): void
    {
        Schema::table('households', function (Blueprint $table) {
            $table->unsignedSmallInteger('founding_number')->nullable()->unique()->after('status');
            $table->timestamp('founding_joined_at')->nullable()->after('founding_number');
        });

        Schema::create('producer_follows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            // A follow is created or dropped, never updated, so it carries
            // one timestamp set by the database rather than a pair.
            $table->timestamp('created_at')->useCurrent();

            // One follow per person per producer, and the notifier reads by
            // producer.
            $table->unique(['user_id', 'household_id']);
            $table->index('household_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('producer_follows');

        Schema::table('households', function (Blueprint $table) {
            $table->dropColumn(['founding_number', 'founding_joined_at']);
        });
    }
};
