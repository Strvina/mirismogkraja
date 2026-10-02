<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indexes shaped after the queries the public pages actually run, so they
 * stay index lookups as the catalog grows instead of turning into scans.
 *
 * Each composite index starts with the column its old single-column index
 * covered, so that one is dropped as redundant - after the new one exists,
 * since MySQL will not drop an index a foreign key is still leaning on.
 * Nothing here touches data.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // The catalog: published products, newest first.
            $table->index(['status', 'created_at']);
            // A producer's page and every per-producer product count.
            $table->index(['household_id', 'status']);
            // The category filter and "similar products".
            $table->index(['category_id', 'status']);
        });

        Schema::table('products', fn (Blueprint $table) => $table->dropIndex(['status']));

        Schema::table('households', function (Blueprint $table) {
            // The producer directory: published ones, by name.
            $table->index(['status', 'name']);
        });

        Schema::table('households', fn (Blueprint $table) => $table->dropIndex(['status']));

        Schema::table('reviews', function (Blueprint $table) {
            // A producer's page reads its approved reviews, newest first.
            $table->index(['household_id', 'status', 'created_at']);
            // The moderation queue: one status, newest first.
            $table->index(['status', 'created_at']);
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropIndex(['household_id', 'created_at']);
            $table->dropIndex(['status']);
        });

        Schema::table('producer_messages', function (Blueprint $table) {
            // The unread badge, on every page of every signed-in visitor:
            // messages addressed to this buyer that are still unread.
            $table->index(['buyer_id', 'read_at']);
        });
    }

    public function down(): void
    {
        // On MySQL these composite indexes are also what backs the foreign
        // keys (MySQL drops its own key index once another one covers the
        // column), so a plain one goes back first or the drop is refused.
        Schema::table('producer_messages', fn (Blueprint $table) => $table->index('buyer_id'));
        Schema::table('producer_messages', fn (Blueprint $table) => $table->dropIndex(['buyer_id', 'read_at']));

        Schema::table('reviews', function (Blueprint $table) {
            $table->index(['household_id', 'created_at']);
            $table->index('status');
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropIndex(['household_id', 'status', 'created_at']);
            $table->dropIndex(['status', 'created_at']);
        });

        Schema::table('households', fn (Blueprint $table) => $table->index('status'));
        Schema::table('households', fn (Blueprint $table) => $table->dropIndex(['status', 'name']));

        Schema::table('products', function (Blueprint $table) {
            $table->index('status');
            $table->index('household_id');
            $table->index('category_id');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['status', 'created_at']);
            $table->dropIndex(['household_id', 'status']);
            $table->dropIndex(['category_id', 'status']);
        });
    }
};
