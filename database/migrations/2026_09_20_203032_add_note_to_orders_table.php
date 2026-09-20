<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Free text a buyer can add to their inquiry (task 17) - preferred
     * pickup time, packaging, anything the producer should know before
     * getting in touch.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->text('note')->nullable()->after('shipping_address');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('note');
        });
    }
};
