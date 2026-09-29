<?php

namespace App\Contracts;

use App\Models\Producer;

/**
 * Something a producer pays for by bank slip - a membership, a boost.
 *
 * The slip and its QR code are built from these four things alone, so every
 * kind of payment is printed and scanned the same way.
 */
interface Payable
{
    /** Whose payment this is; the slip names them and their owner. */
    public function paymentProducer(): Producer;

    /** Whole dinars. */
    public function paymentAmount(): int;

    /** The "poziv na broj" the admin matches the money by. */
    public function paymentReference(): string;

    /**
     * What the payment is for, or null for the default wording the admin
     * set for memberships. The producer's name is appended either way.
     */
    public function paymentPurpose(): ?string;
}
