<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->string('status')->default('pending')->after('subtotal');
            $table->index(['household_id', 'status']);
        });

        // Preserve the state of inquiries created before status became
        // producer-specific.
        DB::table('order_items')->orderBy('id')->eachById(function (object $item): void {
            $status = DB::table('orders')->where('id', $item->order_id)->value('status');

            DB::table('order_items')->where('id', $item->id)->update(['status' => $status]);
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex(['household_id', 'status']);
            $table->dropColumn('status');
        });
    }
};
