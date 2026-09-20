<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The platform brokers contact rather than processing payment or
     * shipping (task 17), so an order is really a purchase inquiry and its
     * old shipping-flow statuses don't describe anything the platform can
     * observe. They collapse to the four the producer self-reports:
     * pending -> contacted -> fulfilled, or cancelled.
     */
    public function up(): void
    {
        $this->allowAnyStatus();

        DB::table('orders')->where('status', 'confirmed')->update(['status' => 'contacted']);
        DB::table('orders')->whereIn('status', ['shipped', 'delivered'])->update(['status' => 'fulfilled']);

        $this->restrictStatusTo(['pending', 'contacted', 'fulfilled', 'cancelled']);
    }

    public function down(): void
    {
        $this->allowAnyStatus();

        DB::table('orders')->where('status', 'contacted')->update(['status' => 'confirmed']);
        DB::table('orders')->where('status', 'fulfilled')->update(['status' => 'delivered']);

        $this->restrictStatusTo(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']);
    }

    /**
     * Drop the column's constraint so rows can be moved to values the old
     * definition doesn't allow. MySQL keeps an enum (widened); SQLite's enum
     * is a string plus a CHECK, so it becomes a plain string first.
     */
    private function allowAnyStatus(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('status')->default('pending')->change();
        });
    }

    /** @param  list<string>  $values */
    private function restrictStatusTo(array $values): void
    {
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            // SQLite would have to rebuild the table for a CHECK constraint;
            // the app validates statuses anyway.
            return;
        }

        $list = collect($values)->map(fn (string $value) => "'{$value}'")->join(',');

        DB::statement("ALTER TABLE orders MODIFY status ENUM({$list}) NOT NULL DEFAULT 'pending'");
    }
};
