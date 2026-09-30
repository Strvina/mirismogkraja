<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The seller's half of the unread badge: messages to the producers a user
 * owns that are still unread. The buyer's half already has
 * (buyer_id, read_at); this is its twin, so neither half scans the table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('producer_messages', fn (Blueprint $table) => $table->index(['household_id', 'read_at']));
    }

    public function down(): void
    {
        Schema::table('producer_messages', fn (Blueprint $table) => $table->dropIndex(['household_id', 'read_at']));
    }
};
