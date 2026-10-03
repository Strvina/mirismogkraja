<?php

namespace App\Services;

use App\Contracts\Payable;
use App\Support\Qr;
use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * Renders the payment slip as a real PDF file.
 *
 * On the server rather than in the browser, because the slip has to carry
 * Serbian letters and the fonts a browser-side PDF library ships with do
 * not: a producer called Nićić would come out as Nicic, or worse. dompdf
 * ships DejaVu Sans, which has them.
 *
 * It also means the file is a download and nothing else - no print dialog,
 * no "save as" detour, and the same bytes whichever browser asked for it.
 */
class PaymentSlipPdf
{
    public function __construct(private readonly PaymentSlipService $slips) {}

    public function render(Payable $payable): string
    {
        $slip = $this->slips->detailsFor($payable);

        $html = view('pdf.payment-slip', [
            'slip' => $slip,
            'qr' => Qr::dataUri($slip['qr']),
        ])->render();

        $options = new Options;
        $options->set('defaultFont', 'DejaVu Sans');
        // The template embeds its QR as a data URI and loads nothing else;
        // leaving remote fetching off keeps a PDF render from ever reaching
        // out to the network.
        $options->set('isRemoteEnabled', false);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4');
        $dompdf->render();

        return $dompdf->output();
    }

    public function filenameFor(Payable $payable): string
    {
        return 'uplatnica-'.$payable->paymentReference().'.pdf';
    }
}
