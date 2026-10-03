<?php

namespace App\Http\Controllers;

use App\Services\PaymentSlipService;
use App\Support\PaidItems;
use App\Support\Qr;
use Illuminate\Http\Response;

/**
 * The IPS QR code of a payment slip, as an image the slip dialog shows.
 * Fetched only when the dialog opens, so the pages that list slips carry
 * no QR data, and drawn by the same code as the slip's PDF.
 */
class PaymentSlipQrController extends Controller
{
    public function __invoke(string $kind, int $id, PaymentSlipService $slips): Response
    {
        $item = PaidItems::find($kind, $id);
        $this->authorize('update', $item->producer);

        return response(Qr::svg($slips->qrPayload($item)), 200, [
            'Content-Type' => 'image/svg+xml',
            // The slip's details do not change once requested.
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }
}
