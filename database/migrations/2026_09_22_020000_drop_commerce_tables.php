<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The platform introduces buyers to producers and then steps aside: the
     * two agree on quantity, price and delivery directly. Carts, checkout and
     * order fulfilment never described anything the platform could honour, so
     * the tables behind them are dropped rather than left to drift.
     *
     * The migrations that created these tables are gone with them, which is
     * why this drop is guarded and why down() cannot bring the data back.
     */
    public function up(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('cart_items');
    }

    public function down(): void
    {
        // Irreversible: the commerce schema was removed from the codebase.
    }
};
