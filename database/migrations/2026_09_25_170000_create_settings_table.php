<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Settings the owner changes themselves.
     *
     * The bank account a membership is paid into started life in .env, which
     * meant changing it was a deploy and a text editor. It is not a secret
     * and not a per-environment technical knob - it is printed on every
     * payment slip - so it belongs where the prices already are: in the
     * database, editable from the admin panel.
     */
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
