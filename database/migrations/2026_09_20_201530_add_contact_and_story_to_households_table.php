<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Contact details and the "behind the scenes" story shown on a
     * producer's public page (task 8). Contact lives on the producer rather
     * than their user account: it's the business's public contact, which
     * isn't necessarily the owner's personal phone or login email.
     */
    public function up(): void
    {
        Schema::table('households', function (Blueprint $table) {
            $table->string('phone')->nullable()->after('delivery_methods');
            $table->string('contact_email')->nullable()->after('phone');
            $table->text('story')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('households', function (Blueprint $table) {
            $table->dropColumn(['phone', 'contact_email', 'story']);
        });
    }
};
