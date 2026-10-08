<?php

/*
 * Which proxies in front of the site are believed.
 *
 * Behind Cloudflare or a load balancer every request arrives from the
 * proxy's address, with the visitor's own address and "this was HTTPS" in
 * headers. Unless the proxy is named here those headers are ignored - as
 * they must be, or anyone could send them - and then every visitor looks
 * like one address sharing one rate limit, and the site thinks it is being
 * read over plain HTTP.
 *
 * TRUSTED_PROXIES: empty when the web server faces the internet itself
 * (the setup in docs/deploy.md), "*" when the only way in is through the
 * proxy, or a comma-separated list of its addresses and ranges.
 */

$proxies = (string) env('TRUSTED_PROXIES', '');

return [
    'proxies' => match (true) {
        $proxies === '' => null,
        $proxies === '*' => '*',
        default => array_map('trim', explode(',', $proxies)),
    },
];
