<?php

namespace App\Support;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Lang;

/**
 * The sentence a stored notification reads as, in the current language.
 *
 * Notifications keep their occasion and facts, not the words (see
 * SiteNotification), so the same row reads in Serbian to one person and in
 * English to another. Rows written before that kept the words themselves,
 * and are shown as they were.
 *
 * Params whose name ends in "_on" are dates and those ending in "_label" are
 * translation keys, so both read in the reader's language too.
 */
class NotificationText
{
    /**
     * @param  array<string, mixed>  $data
     * @return array{title: string, body: string|null}
     */
    public static function for(array $data): array
    {
        if (isset($data['title'])) {
            return ['title' => (string) $data['title'], 'body' => $data['body'] ?? null];
        }

        $key = 'notifications.'.($data['type'] ?? '');
        $params = collect($data['params'] ?? [])
            ->map(fn ($value, string $name) => match (true) {
                str_ends_with($name, '_on') => Carbon::parse($value)->translatedFormat(__('notifications.date_format')),
                str_ends_with($name, '_label') => __((string) $value),
                default => $value,
            })
            ->all();

        return [
            'title' => Lang::has($key.'.title') ? __($key.'.title', $params) : '',
            'body' => Lang::has($key.'.body') ? __($key.'.body', $params) : null,
        ];
    }
}
