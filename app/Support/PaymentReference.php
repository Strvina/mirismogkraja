<?php

namespace App\Support;

use App\Models\Boost;
use App\Models\ProducerSubscription;

/**
 * A "poziv na broj" valid under model 97: two control digits, a dash, and
 * eight digits.
 *
 * A reference on a Serbian slip may hold only digits and dashes, and under
 * model 97 its first two digits must check out (ISO 7064 MOD 97-10) - a bank
 * rejects anything else at the counter, and a banking app refuses the QR.
 * The control digits also catch the one mistake a hand-copied slip is prone
 * to: a mistyped digit.
 *
 * Unique across everything that is paid by slip, since the reference is
 * all an admin has to tell one payment from another.
 */
class PaymentReference
{
    public static function generate(): string
    {
        do {
            $base = (string) random_int(10_000_000, 99_999_999);
            $reference = self::controlDigits($base).'-'.$base;
        } while (
            ProducerSubscription::where('reference', $reference)->exists()
            || Boost::where('reference', $reference)->exists()
        );

        return $reference;
    }

    /** ISO 7064 MOD 97-10, as model 97 prescribes. */
    public static function controlDigits(string $digits): string
    {
        return str_pad((string) (98 - ((int) $digits * 100) % 97), 2, '0', STR_PAD_LEFT);
    }
}
