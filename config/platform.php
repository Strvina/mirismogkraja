<?php

return [
    /*
     * Where a producer's membership payment goes. Memberships are paid by
     * bank slip, so these details end up printed on a piece of paper - they
     * belong in configuration the owner can change per environment, not in a
     * component.
     */
    'payment' => [
        'recipient' => env('PLATFORM_PAYMENT_RECIPIENT', 'Vrelina juga'),
        'account' => env('PLATFORM_PAYMENT_ACCOUNT', '000-0000000000000-00'),
        'purpose' => env('PLATFORM_PAYMENT_PURPOSE', 'Članarina za Vrelina juga'),
        'model' => env('PLATFORM_PAYMENT_MODEL', '97'),
    ],
];
