<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * MySQL and MariaDB give every foreign key an index of its own. SQLite does
 * not, so there - in the test suite, the browser tests and a developer's
 * copy - two queries the site runs all the time read a whole table:
 * "this account's producers" behind the unread badge on every signed-in
 * page, and "messages opened from this product" behind the home page's
 * ranking, which with 200,000 messages never finished.
 *
 * Only where the database has not made them already: a second index on the
 * same column would be dead weight on every write.
 */
return new class extends Migration
{
    public function up(): void
    {
        if ($this->indexedByTheDatabase()) {
            return;
        }

        Schema::table('producers', fn (Blueprint $table) => $table->index('user_id'));
        Schema::table('producer_messages', fn (Blueprint $table) => $table->index('product_id'));
    }

    public function down(): void
    {
        if ($this->indexedByTheDatabase()) {
            return;
        }

        Schema::table('producer_messages', fn (Blueprint $table) => $table->dropIndex(['product_id']));
        Schema::table('producers', fn (Blueprint $table) => $table->dropIndex(['user_id']));
    }

    private function indexedByTheDatabase(): bool
    {
        return in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true);
    }
};
