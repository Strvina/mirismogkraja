<?php

namespace App\Support;

use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\SvgWriter;

/**
 * Every QR code on the site - the payment slip's, on screen and in the PDF,
 * and the stall poster's - comes from here.
 *
 * SVG rather than PNG: sharp at any print size, small, and no GD needed.
 */
final class Qr
{
    public static function svg(string $data, ErrorCorrectionLevel $correction = ErrorCorrectionLevel::Medium, int $size = 320, int $margin = 8): string
    {
        return (new SvgWriter)->write(self::code($data, $correction, $size, $margin))->getString();
    }

    /** For a PDF, which reads no files of its own. */
    public static function dataUri(string $data, ErrorCorrectionLevel $correction = ErrorCorrectionLevel::Medium, int $size = 320, int $margin = 8): string
    {
        return (new SvgWriter)->write(self::code($data, $correction, $size, $margin))->getDataUri();
    }

    private static function code(string $data, ErrorCorrectionLevel $correction, int $size, int $margin): QrCode
    {
        return new QrCode(
            data: $data,
            encoding: new Encoding('UTF-8'),
            errorCorrectionLevel: $correction,
            size: $size,
            margin: $margin,
        );
    }
}
