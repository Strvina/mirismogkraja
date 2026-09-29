<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Either side can close a conversation now, and only the side that closed
 * it can open it again - so the block has to remember who that was. Every
 * existing block was made by a producer.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversation_blocks', function (Blueprint $table) {
            $table->string('blocked_by', 10)->default('producer')->after('buyer_id');
        });
    }

    public function down(): void
    {
        Schema::table('conversation_blocks', function (Blueprint $table) {
            $table->dropColumn('blocked_by');
        });
    }
};
