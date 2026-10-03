<?php

namespace App\Services;

use App\Models\Producer;
use App\Support\Media;
use Dompdf\Dompdf;
use Dompdf\Options;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\SvgWriter;
use Throwable;

/**
 * A printable A4 poster for a producer's market stall: their name and a QR
 * code that opens their page on the site, where a passer-by can follow
 * them, save them, or write to them after the market has closed.
 *
 * The code carries ?izvor=qr, so a scan is counted in the producer's
 * statistics (ProducerStatistics::QR_SCAN) - the one number that tells
 * them whether the poster on the stall does anything.
 */
class ProducerPosterPdf
{
    /** Formats dompdf draws; a WebP logo is left off rather than shown broken. */
    private const EMBEDDABLE_LOGOS = ['jpg', 'jpeg', 'png', 'gif'];

    public function render(Producer $producer): string
    {
        $html = view('pdf.producer-poster', [
            'producer' => $producer,
            'url' => self::url($producer),
            'qr' => $this->qrDataUri(self::url($producer)),
            'logo' => $this->logoDataUri($producer),
        ])->render();

        $options = new Options;
        $options->set('defaultFont', 'DejaVu Sans');
        // Everything is embedded as data URIs; a render never goes online.
        $options->set('isRemoteEnabled', false);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4');
        $dompdf->render();

        return $dompdf->output();
    }

    public static function url(Producer $producer): string
    {
        return route('marketplace.producers.show', ['producer' => $producer->slug, 'izvor' => 'qr']);
    }

    public function filenameFor(Producer $producer): string
    {
        return 'poster-'.$producer->slug.'.pdf';
    }

    /**
     * High error correction: a poster lives outdoors, gets folded, splashed
     * and taped over at a corner, and a phone should still read it.
     */
    private function qrDataUri(string $url): string
    {
        $qr = new QrCode(
            data: $url,
            encoding: new Encoding('UTF-8'),
            errorCorrectionLevel: ErrorCorrectionLevel::High,
            size: 600,
            margin: 0,
        );

        return (new SvgWriter)->write($qr)->getDataUri();
    }

    private function logoDataUri(Producer $producer): ?string
    {
        $path = $producer->logo_path;

        if (! $path || ! in_array(strtolower(pathinfo($path, PATHINFO_EXTENSION)), self::EMBEDDABLE_LOGOS, true)) {
            return null;
        }

        try {
            $contents = Media::disk()->get($path);
        } catch (Throwable) {
            return null;
        }

        if (! $contents) {
            return null;
        }

        $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($contents) ?: 'image/jpeg';

        return "data:{$mime};base64,".base64_encode($contents);
    }
}
