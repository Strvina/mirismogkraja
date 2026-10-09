<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Three indexes found by measuring the site with 50,000 products
 * (docs/performance.md has the queries, their plans and the numbers).
 * Nothing here touches data.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_images', function (Blueprint $table) {
            // The photos of a page of products, in their order: every list
            // of product cards reads them, and on SQLite - which does not
            // index a foreign key by itself - read the whole table to do so.
            $table->index(['product_id', 'order']);
        });

        Schema::table('products', function (Blueprint $table) {
            // The admin's list of all products, newest first: with no
            // status chosen, (status, created_at) cannot give the order.
            $table->index('created_at');
            // A producer's newest products, on their public page. Starts
            // with the two columns the old index had, so that one goes.
            $table->index(['producer_id', 'status', 'created_at']);
        });

        // Named as it was created, before the households table was renamed.
        Schema::table('products', fn (Blueprint $table) => $table->dropIndex('products_household_id_status_index'));
    }

    public function down(): void
    {
        Schema::table('products', fn (Blueprint $table) => $table->index(['producer_id', 'status'], 'products_household_id_status_index'));

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['producer_id', 'status', 'created_at']);
            $table->dropIndex(['created_at']);
        });

        // On MySQL the composite index is also what backs the foreign key
        // (MySQL drops its own key index once another one covers the
        // column), so a plain one goes back first or the drop is refused.
        if (in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            Schema::table('product_images', fn (Blueprint $table) => $table->index('product_id', 'product_images_product_id_foreign'));
        }

        Schema::table('product_images', fn (Blueprint $table) => $table->dropIndex(['product_id', 'order']));
    }
};
