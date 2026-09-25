<?php

namespace App\Services;

use App\Models\ProducerSubscription;
use App\Support\Settings;

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
 *
 * Who pays is the person, not the business: a slip is signed by whoever
 * walks up to the counter, and the bank matches the name on it to them. The
 * producer's name belongs in the purpose instead, which is where the payee
 * actually reads what the money is for.
 */
class PaymentSlipService
{
    public function __construct(private readonly Settings $settings) {}

    /**
     * @return array<string, string>
     */
    public function detailsFor(ProducerSubscription $subscription): array
    {
        $subscription->loadMissing(['plan', 'producer.user']);

        return [
            'recipient' => $this->setting('recipient'),
            'recipient_address' => $this->setting('address'),
            'account' => $this->setting('account'),
            'purpose' => $this->purposeFor($subscription),
            'payment_code' => $this->setting('code'),
            'model' => $this->setting('model'),
            'reference' => $subscription->reference,
            'amount' => number_format($subscription->amount_rsd, 2, ',', '.'),
            'payer' => $this->payerFor($subscription),
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
        $subscription->loadMissing(['producer.user']);
        $address = $this->setting('address');

        $fields = [
            'K:PR',
            'V:01',
            'C:1',
            'R:'.$this->accountDigits($this->setting('account')),
            'N:'.$this->clean($this->setting('recipient').($address ? "\n".$address : '')),
            'I:RSD'.number_format($subscription->amount_rsd, 2, ',', ''),
            'P:'.$this->clean($this->payerFor($subscription)),
            'SF:'.$this->setting('code'),
            'S:'.$this->clean($this->purposeFor($subscription)),
            'RO:'.$this->setting('model').str_replace('-', '', $subscription->reference),
        ];

        return implode('|', $fields);
    }

    /** The person paying, not the business they registered. */
    private function payerFor(ProducerSubscription $subscription): string
    {
        return $subscription->producer->user?->name ?? $subscription->producer->name;
    }

    /**
     * Names the producer the membership is for, so the payee can tell two
     * slips from the same person apart.
     */
    private function purposeFor(ProducerSubscription $subscription): string
    {
        return $this->setting('purpose').' - '.$subscription->producer->name;
    }

    private function setting(string $key): string
    {
        return (string) $this->settings->get('payment.'.$key, (string) config('platform.payment.'.$key));
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
