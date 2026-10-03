<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Javi mi kad stigne": someone waiting for a product that is out of stock
 * or out of season. A row lives until it has been answered (see
 * products:send-alerts), then goes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['user_id', 'product_id']);
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_alerts');
    }
};
