<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Seasonal campaigns (task 20.3): "Ajvar sezona", "Slava", "Uskrs" - a
 * themed page and a homepage banner for a few weeks, which producers pay
 * to join.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->date('starts_on');
            $table->date('ends_on');
            $table->unsignedInteger('price_rsd');
            // Drafted campaigns stay hidden from producers and the public
            // until the admin publishes them.
            $table->boolean('is_active')->default(false);
            $table->timestamps();

            $table->index(['is_active', 'starts_on', 'ends_on']);
        });

        Schema::create('campaign_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('pending_payment');
            $table->string('reference')->unique();
            $table->unsignedInteger('amount_rsd');
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            // A producer joins a campaign once.
            $table->unique(['campaign_id', 'household_id']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_participants');
        Schema::dropIfExists('campaigns');
    }
};
