<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('households', function (Blueprint $table) {
            $table->index('status');
            $table->index('city');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('households', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['city']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });
    }
};
