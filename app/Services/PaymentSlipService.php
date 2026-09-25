<?php

namespace App\Services;

use App\Models\ProducerSubscription;

/**
 * The details a producer needs to pay a membership, in the shape a Serbian
 * payment slip and a bank application expect (task 20.1).
 *
 * The QR payload follows the NBS IPS QR specification, which is what every
 * banking app in Serbia scans: fields separated by '|', a fixed header, the
 * account as eighteen digits with no separators, and the amount as RSD with
 * a comma. Building it here rather than in the page keeps one definition of
 * what gets printed and what gets scanned - if they disagreed, the money
 * would arrive without a reference and nobody could match it to a producer.
 */
class PaymentSlipService
{
    /**
     * @return array<string, string>
     */
    public function detailsFor(ProducerSubscription $subscription): array
    {
        $subscription->loadMissing(['plan', 'producer']);
        $payment = config('platform.payment');

        return [
            'recipient' => $payment['recipient'],
            'recipient_address' => $payment['address'] ?? '',
            'account' => $payment['account'],
            'purpose' => $payment['purpose'],
            'payment_code' => (string) $payment['code'],
            'model' => (string) $payment['model'],
            'reference' => $subscription->reference,
            'amount' => number_format($subscription->amount_rsd, 2, ',', '.'),
            'payer' => $subscription->producer->name,
            'qr' => $this->qrPayload($subscription),
        ];
    }

    /**
     * The string a banking app reads off the QR code. Anything the payer
     * must not have to type is in here: account, amount, reference and
     * purpose.
     */
    public function qrPayload(ProducerSubscription $subscription): string
    {
        $payment = config('platform.payment');

        $fields = [
            'K:PR',
            'V:01',
            'C:1',
            'R:'.$this->accountDigits($payment['account']),
            'N:'.$this->clean($payment['recipient'].($payment['address'] ? "\n".$payment['address'] : '')),
            'I:RSD'.number_format($subscription->amount_rsd, 2, ',', ''),
            'P:'.$this->clean($subscription->producer->name),
            'SF:'.$payment['code'],
            'S:'.$this->clean($payment['purpose']),
            'RO:'.$payment['model'].str_replace('-', '', $subscription->reference),
        ];

        return implode('|', $fields);
    }

    /**
     * Serbian account numbers are written 000-0000000000000-00 but travel as
     * eighteen bare digits; the middle part is padded because banks print it
     * without its leading zeros.
     */
    private function accountDigits(string $account): string
    {
        $parts = explode('-', $account);

        if (count($parts) !== 3) {
            return preg_replace('/\D/', '', $account);
        }

        return str_pad($parts[0], 3, '0', STR_PAD_LEFT)
            .str_pad($parts[1], 13, '0', STR_PAD_LEFT)
            .str_pad($parts[2], 2, '0', STR_PAD_LEFT);
    }

    /** '|' separates fields, so it can never appear inside one. */
    private function clean(string $value): string
    {
        return trim(str_replace('|', ' ', $value));
    }
}
