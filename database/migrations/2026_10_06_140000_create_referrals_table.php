<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Preporuči proizvođača": a producer's personal link, and who signed up
 * through it. Both sides get a month of Premium once the new producer is
 * approved by an admin.
 *
 * The unique indexes carry the two rules that keep it from being farmed:
 * an account can be referred once, and a producer can earn a reward once.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('producers', function (Blueprint $table) {
            // Made the first time the producer opens their referral page.
            $table->string('referral_code', 12)->nullable()->unique();
        });

        Schema::create('referrals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referrer_producer_id')->constrained('producers')->cascadeOnDelete();
            // Recorded when the account is created, and only then.
            $table->foreignId('referred_user_id')->unique()->constrained('users')->cascadeOnDelete();
            // The new account's first approved producer.
            $table->foreignId('referred_producer_id')->nullable()->unique()->constrained('producers')->nullOnDelete();
            $table->string('status', 20)->default('pending');
            $table->timestamp('rewarded_at')->nullable();
            $table->timestamps();

            // "How many rewards has this producer had this year?"
            $table->index(['referrer_producer_id', 'rewarded_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referrals');

        Schema::table('producers', function (Blueprint $table) {
            $table->dropUnique(['referral_code']);
            $table->dropColumn('referral_code');
        });
    }
};
