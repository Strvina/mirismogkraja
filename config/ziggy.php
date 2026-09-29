<?php

/*
 * The route list Ziggy writes into every full page load, for route() in the
 * browser. Visitors get it without the admin panel's routes: they cannot
 * use them, and there is no reason to hand every visitor a map of the
 * panel. Admins get everything (see resources/views/app.blade.php).
 */
return [
    'groups' => [
        'public' => ['!admin.*', '!storage.*'],
    ],
];
