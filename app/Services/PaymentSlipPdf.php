<?php

namespace App\Services;

use App\Models\ProducerSubscription;
use Dompdf\Dompdf;
use Dompdf\Options;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\SvgWriter;

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

    public function render(ProducerSubscription $subscription): string
    {
        $slip = $this->slips->detailsFor($subscription);

        $html = view('pdf.payment-slip', [
            'slip' => $slip,
            'qr' => $this->qrDataUri($slip['qr']),
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

    public function filenameFor(ProducerSubscription $subscription): string
    {
        return 'uplatnica-'.$subscription->reference.'.pdf';
    }

    /**
     * The QR as a data URI, since dompdf reads no files of its own here.
     *
     * Written as SVG rather than PNG: it stays sharp at whatever size the
     * slip is printed, the file is smaller, and it needs no GD extension -
     * which this machine, and plenty of shared hosts, do not have.
     *
     * Medium correction leaves the code readable when the print smudges,
     * without making it so dense a phone camera struggles.
     */
    private function qrDataUri(string $payload): string
    {
        $qr = new QrCode(
            data: $payload,
            encoding: new Encoding('UTF-8'),
            errorCorrectionLevel: ErrorCorrectionLevel::Medium,
            size: 320,
            margin: 8,
        );

        return (new SvgWriter)->write($qr)->getDataUri();
    }
}
