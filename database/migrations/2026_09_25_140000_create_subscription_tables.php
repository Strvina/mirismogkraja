<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Task 20.1: producers pay a yearly membership, and the platform takes
     * nothing from the sale itself.
     *
     * Payment is by bank slip (uplatnica), so nothing here talks to a payment
     * provider: a producer picks a plan, gets a reference number to write on
     * the slip, and an admin marks it paid once the money shows up. That is
     * why a subscription starts life as 'pending_payment' rather than active.
     *
     * Prices live in the table, not in code, because the owner has to be able
     * to change them from the panel.
     */
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            // Whole dinars: memberships are never priced in para, and an
            // integer cannot drift the way a float does.
            $table->unsignedInteger('price_rsd');
            $table->unsignedSmallInteger('duration_days')->default(365);
            // What the plan unlocks, as a list of feature keys the
            // application checks by name.
            $table->json('features')->nullable();
            // Higher tiers rank above lower ones where a tie has to be
            // broken; also the order they are listed in.
            $table->unsignedTinyInteger('level')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('producer_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscription_plan_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('pending_payment');
            // Written on the payment slip so an admin can match the money to
            // the producer without guessing.
            $table->string('reference')->unique();
            $table->unsignedInteger('amount_rsd');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            // Which reminders have gone out, so the daily command does not
            // send the same one every day until the membership ends.
            $table->timestamp('expiry_warned_at')->nullable();
            $table->timestamps();

            // The daily command reads by status and end date; the producer's
            // own page reads their newest.
            $table->index(['status', 'ends_at']);
            $table->index(['household_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('producer_subscriptions');
        Schema::dropIfExists('subscription_plans');
    }
};
