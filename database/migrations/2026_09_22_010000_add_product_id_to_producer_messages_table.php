<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('producer_messages', fn (Blueprint $table) => $table->foreignId('product_id')->nullable()->after('household_id')->constrained()->nullOnDelete());
    }

    /**
     * Databases migrated before up() was corrected have this key under the
     * name "1" (an ->index() chained onto the foreign key was taken as its
     * name), so the key and its index are looked up rather than assumed.
     */
    public function down(): void
    {
        $foreign = collect(Schema::getForeignKeys('producer_messages'))->first(fn (array $key) => $key['columns'] === ['product_id']);
        $index = collect(Schema::getIndexes('producer_messages'))->first(fn (array $index) => $index['columns'] === ['product_id']);

        Schema::table('producer_messages', function (Blueprint $table) use ($foreign, $index) {
            $table->dropForeign(filled($foreign['name'] ?? null) ? $foreign['name'] : ['product_id']);

            if ($index !== null) {
                $table->dropIndex($index['name']);
            }

            $table->dropColumn('product_id');
        });
    }
};
