<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What a category's own page says to a search engine.
 *
 * `search_name` is the category as people type it - "Domaći ajvar", not
 * "Ajvar"; "Domaća rakija i vino", not "Rakija i vino" - which the name
 * cannot be turned into by rule, the adjective agreeing with the noun.
 * `intro` is a paragraph of the owner's own for the top of that page.
 * Both are optional: without them the page is titled by the name alone.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->string('search_name')->nullable()->after('slug');
            $table->text('intro')->nullable()->after('search_name');
        });
    }

    public function down(): void
    {
        Schema::table('categories', fn (Blueprint $table) => $table->dropColumn(['search_name', 'intro']));
    }
};
