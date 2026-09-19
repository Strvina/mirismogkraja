<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * How a producer hands goods over (task 13). A producer can offer more
     * than one, so this is a JSON list of the values in
     * Producer::DELIVERY_METHODS rather than a single enum column.
     */
    public function up(): void
    {
        Schema::table('households', function (Blueprint $table) {
            $table->json('delivery_methods')->nullable()->after('city');
        });
    }

    public function down(): void
    {
        Schema::table('households', function (Blueprint $table) {
            $table->dropColumn('delivery_methods');
        });
    }
};
