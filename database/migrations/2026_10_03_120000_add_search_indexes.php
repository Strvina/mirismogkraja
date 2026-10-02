<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * FULLTEXT indexes for the catalogue search (App\Support\Search). MySQL
 * only: SQLite - the test suite - has no such index, and the search falls
 * back to LIKE there.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! $this->supported()) {
            return;
        }

        Schema::table('products', fn (Blueprint $table) => $table->fullText(['name', 'description']));
        Schema::table('households', fn (Blueprint $table) => $table->fullText(['name', 'description']));
    }

    public function down(): void
    {
        if (! $this->supported()) {
            return;
        }

        Schema::table('products', fn (Blueprint $table) => $table->dropFullText(['name', 'description']));
        Schema::table('households', fn (Blueprint $table) => $table->dropFullText(['name', 'description']));
    }

    private function supported(): bool
    {
        return in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true);
    }
};
