<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Reviews are no longer published the moment they're written: an admin
     * approves or rejects them first, so spam never reaches a producer's
     * public page. `approved_at` - not `created_at` - is what the public
     * "pre 2 dana" stamp counts from, since that's when the text actually
     * became visible.
     */
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->string('status')->default('pending')->after('image_path');
            $table->timestamp('approved_at')->nullable()->after('status');
            $table->index('status');
        });

        // Everything written before moderation existed was already public;
        // holding it back now would silently empty the producer pages.
        DB::table('reviews')->update([
            'status' => 'approved',
            'approved_at' => DB::raw('created_at'),
        ]);
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropColumn(['status', 'approved_at']);
        });
    }
};
