<?php

/*
 * Defaults for what the owner edits in the admin panel. The values in use
 * are settings (App\Support\Settings); these only apply until the owner has
 * saved their own, so a fresh install still prints a complete slip.
 */
return [
    /*
     * Where payments by bank slip go - printed on every slip and built into
     * its QR code.
     */
    'payment' => [
        'recipient' => env('PLATFORM_PAYMENT_RECIPIENT', 'Vrelina juga'),
        'account' => env('PLATFORM_PAYMENT_ACCOUNT', '000-0000000000000-00'),
        'purpose' => env('PLATFORM_PAYMENT_PURPOSE', 'Članarina za Vrelina juga'),
        'address' => env('PLATFORM_PAYMENT_ADDRESS', ''),
        'model' => env('PLATFORM_PAYMENT_MODEL', '97'),
        /*
         * Šifra plaćanja. 221 is goods and services paid from an account,
         * which is what a membership is.
         */
        'code' => env('PLATFORM_PAYMENT_CODE', '221'),
    ],

    /*
     * Paid boosts (task 20.2), in whole dinars and days.
     */
    'boost' => [
        'profile_price' => 1000,
        'product_price' => 800,
        'days' => 7,
    ],
];
