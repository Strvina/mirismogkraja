<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What people searched the catalogue for and did not find: demand nobody
 * on the site is meeting yet.
 *
 * Daily counters, like producer_stats - one row per term and day, bumped in
 * place. Nothing about who searched is kept.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('search_misses', function (Blueprint $table) {
            $table->id();
            $table->string('term', 60);
            $table->date('date');
            $table->unsignedInteger('hits')->default(0);

            // The write target, and the range the reports read.
            $table->unique(['date', 'term']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('search_misses');
    }
};
