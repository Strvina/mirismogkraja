<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * The columns that hold a status or a kind take only the values the
 * application knows; until now only the models said so, and a row written
 * past them (by hand, by a script) would have been taken as it came. A
 * CHECK makes the database refuse it.
 *
 * MySQL 8.0.16+ and MariaDB enforce CHECK; SQLite would need each table
 * rebuilt to add one, and runs only the tests, so it is left as it was.
 * producers.status, products.status and products.unit are ENUM columns
 * and already refuse anything else.
 *
 * The lists are written out, not read from the models: a migration records
 * the schema as it was on this day. StatusConstraintsTest fails when a
 * model gains a value that the database would refuse.
 */
return new class extends Migration
{
    /** @var array<string, array<string, list<string>>> */
    private const ALLOWED = [
        'boosts' => [
            'status' => ['pending_payment', 'active', 'expired', 'cancelled'],
            'boostable_type' => ['producer', 'product'],
        ],
        'campaign_participants' => ['status' => ['pending_payment', 'active', 'cancelled']],
        'conversation_blocks' => ['blocked_by' => ['producer', 'buyer']],
        'favorites' => ['favoritable_type' => ['producer', 'product']],
        'inquiry_outcomes' => ['status' => ['contacted', 'completed', 'cancelled']],
        'posts' => [
            'type' => ['story', 'recipe'],
            'status' => ['draft', 'published', 'blocked'],
        ],
        'producer_certificates' => [
            'type' => ['organic', 'geographic', 'registered_farm', 'food_safety', 'award', 'other'],
            'status' => ['pending', 'approved', 'rejected'],
        ],
        'producer_change_requests' => ['status' => ['pending', 'approved', 'rejected']],
        'producer_stats' => ['event' => ['profile_view', 'product_view', 'qr_scan', 'catalog_view', 'phone_reveal', 'viber_click', 'whatsapp_click', 'email_click']],
        'producer_subscriptions' => ['status' => ['pending_payment', 'active', 'expired', 'cancelled']],
        'referrals' => ['status' => ['pending', 'rewarded', 'cap_reached', 'same_person', 'expired', 'referrer_inactive']],
        'reports' => [
            'status' => ['open', 'reviewed', 'dismissed'],
            'reportable_type' => ['producer', 'product', 'post', 'user'],
            'reason' => ['prevara', 'ne_odgovara', 'neispravan_proizvod', 'neprimereno', 'spam', 'drugo'],
        ],
        'reviews' => ['status' => ['pending', 'approved', 'rejected']],
        'wanted_ads' => ['status' => ['open', 'closed', 'blocked']],
    ];

    public function up(): void
    {
        if (! $this->enforced()) {
            return;
        }

        foreach (self::ALLOWED as $table => $columns) {
            foreach ($columns as $column => $values) {
                $list = implode(', ', array_map(fn (string $value) => DB::getPdo()->quote($value), $values));
                DB::statement("ALTER TABLE `{$table}` ADD CONSTRAINT `{$table}_{$column}_check` CHECK (`{$column}` IN ({$list}))");
            }
        }
    }

    public function down(): void
    {
        if (! $this->enforced()) {
            return;
        }

        foreach (self::ALLOWED as $table => $columns) {
            foreach (array_keys($columns) as $column) {
                DB::statement("ALTER TABLE `{$table}` DROP CONSTRAINT `{$table}_{$column}_check`");
            }
        }
    }

    private function enforced(): bool
    {
        return in_array(DB::getDriverName(), ['mysql', 'mariadb'], true);
    }
};
