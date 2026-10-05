<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A producer's pause: sold out, away, or between seasons. The page stays
 * online; only new conversations stop until they are back.
 *
 * `paused_until` is the day they said they would return, if they said - the
 * pause then ends by itself. `pause_note` is what visitors read meanwhile.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('producers', function (Blueprint $table) {
            $table->timestamp('paused_at')->nullable()->after('verified_at');
            $table->date('paused_until')->nullable()->after('paused_at');
            $table->string('pause_note', 200)->nullable()->after('paused_until');
        });
    }

    public function down(): void
    {
        Schema::table('producers', fn (Blueprint $table) => $table->dropColumn(['paused_at', 'paused_until', 'pause_note']));
    }
};
