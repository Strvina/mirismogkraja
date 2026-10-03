<?php

/*
 * Only what differs from the package's defaults (top-level keys replace
 * theirs): this app's pages live in resources/js/pages, lowercase. Windows
 * does not mind the default js/Pages; Linux - CI and production - does.
 */
return [

    'page_paths' => [resource_path('js/pages')],

    'testing' => [
        'ensure_pages_exist' => true,
        'page_paths' => [resource_path('js/pages')],
        'page_extensions' => ['tsx', 'ts'],
    ],

];
