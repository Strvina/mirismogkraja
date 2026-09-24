<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * "Nothing in stock" was expressed twice: as a product status and as a
     * stock quantity of zero. The two disagreed - a product marked
     * out_of_stock disappeared from the catalog entirely, while the card was
     * built to show a "Nema na stanju" badge on one that is still listed.
     *
     * The quantity wins, since it is the thing the producer actually keeps
     * up to date, so those products stay published with nothing left. The
     * column's allowed values are left alone: rewriting an enum means
     * rebuilding the table on SQLite, and the application no longer offers
     * or accepts the value.
     */
    public function up(): void
    {
        DB::table('products')
            ->where('status', 'out_of_stock')
            ->update(['status' => 'active', 'stock_quantity' => 0]);
    }

    /**
     * Products that are out of stock can be told apart by their quantity,
     * but whether each one was published or hidden before is not recorded
     * anywhere, so there is nothing faithful to restore.
     */
    public function down(): void
    {
        //
    }
};
