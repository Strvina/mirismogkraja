<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Push notifications were taken out again: e-mail about unread messages
 * covers the same need without keys, a service worker and per-device
 * subscriptions. A database that had the table loses it; one that never
 * did is unaffected.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }

    /** Nothing to bring back. */
    public function down(): void {}
};
