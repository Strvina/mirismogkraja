<?php

namespace App\Support;

/**
 * A link kept for later - a notification's - as a path on this site, not a
 * full address.
 *
 * A full address carries whatever host made it: APP_URL when a scheduled
 * command or a seeder wrote the notification, another domain after a move.
 * Kept as "/isticanje#isticanje-2" and turned back into a full address when
 * clicked, it always leads to the site the reader is actually on - and can
 * never lead off it.
 */
final class LocalUrl
{
    /** "/path?query#fragment" of any URL, full or already relative. */
    public static function path(string $url): string
    {
        $root = rtrim(url('/'), '/');

        if (str_starts_with($url, $root.'/') || $url === $root) {
            $url = substr($url, strlen($root));
        }

        $parts = parse_url($url) ?: [];

        return '/'.ltrim($parts['path'] ?? '', '/')
            .(isset($parts['query']) ? '?'.$parts['query'] : '')
            .(isset($parts['fragment']) ? '#'.$parts['fragment'] : '');
    }

    /** The full address of a stored path, on the host of the current request. */
    public static function resolve(string $url): string
    {
        return rtrim(url('/'), '/').self::path($url);
    }
}
