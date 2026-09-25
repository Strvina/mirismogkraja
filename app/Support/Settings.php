<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Values the owner edits from the admin panel rather than from .env.
 *
 * The bank account a membership is paid into is not a secret and not a
 * per-environment technical knob - it is printed on every payment slip - so
 * keeping it in .env only meant that changing it took a deploy. It belongs
 * where the prices already are.
 *
 * The whole table is cached as one entry and dropped on write: a settings
 * lookup should never cost a query per key.
 */
class Settings
{
    private const CACHE_KEY = 'platform.settings';

    /** @var array<string, string|null>|null */
    private ?array $loaded = null;

    public function get(string $key, ?string $default = null): ?string
    {
        $value = $this->all()[$key] ?? null;

        return ($value === null || $value === '') ? $default : $value;
    }

    /** @return array<string, string|null> */
    public function all(): array
    {
        return $this->loaded ??= Cache::rememberForever(
            self::CACHE_KEY,
            fn () => DB::table('settings')->pluck('value', 'key')->all()
        );
    }

    /** @param  array<string, string|null>  $values */
    public function put(array $values): void
    {
        foreach ($values as $key => $value) {
            DB::table('settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'updated_at' => now(), 'created_at' => now()],
            );
        }

        $this->forget();
    }

    public function forget(): void
    {
        $this->loaded = null;
        Cache::forget(self::CACHE_KEY);
    }
}
