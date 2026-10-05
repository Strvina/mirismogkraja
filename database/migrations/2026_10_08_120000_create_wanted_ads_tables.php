<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Tražim": a buyer writes what they are looking for and producers answer.
 *
 * An answer is an ordinary message in the usual conversation between that
 * producer and that buyer, so nothing about messaging is new - the answer
 * row only records that this producer has answered this ad (once), and the
 * message carries the ad it answers so the thread shows what it is about.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wanted_ads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title', 120);
            $table->text('body');
            // Free text, as a buyer says it: "50 kg", "dve tegle nedeljno".
            $table->string('quantity', 60)->nullable();
            $table->string('city')->nullable();
            $table->string('status', 10)->default('open');
            // An ad nobody closes still stops being shown.
            $table->timestamp('expires_at');
            $table->timestamps();

            // The public list: open, not expired, newest first.
            $table->index(['status', 'expires_at']);
            // A buyer's own list, and the count against their allowance.
            $table->index(['user_id', 'status']);
        });

        Schema::create('wanted_ad_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wanted_ad_id')->constrained()->cascadeOnDelete();
            $table->foreignId('producer_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            // One answer per producer per ad; what follows is a conversation.
            $table->unique(['wanted_ad_id', 'producer_id']);
        });

        Schema::table('producer_messages', function (Blueprint $table) {
            // Set only on a producer's first answer to an ad.
            $table->foreignId('wanted_ad_id')->nullable()->after('product_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('producer_messages', fn (Blueprint $table) => $table->dropConstrainedForeignId('wanted_ad_id'));
        Schema::dropIfExists('wanted_ad_responses');
        Schema::dropIfExists('wanted_ads');
    }
};
