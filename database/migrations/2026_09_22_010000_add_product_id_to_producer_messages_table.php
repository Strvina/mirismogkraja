<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('producer_messages', fn (Blueprint $table) => $table->foreignId('product_id')->nullable()->after('household_id')->constrained()->nullOnDelete()->index());
    }

    public function down(): void
    {
        Schema::table('producer_messages', fn (Blueprint $table) => $table->dropConstrainedForeignId('product_id'));
    }
};
