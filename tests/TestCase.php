<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Http\UploadedFile;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Symfony's test requests claim an English browser by default, and
        // the site answers a browser in its own language. The suite reads
        // the site as a Serbian visitor does; tests of the other languages
        // say so themselves.
        $this->withHeader('Accept-Language', 'sr');
    }

    /**
     * A real (tiny) PNG, under whatever name: uploads are checked for their
     * pixel size, which a placeholder file of zeros does not have. Built by
     * hand because GD is not on every machine that runs the suite.
     */
    protected function fakeImage(string $name = 'photo.png', int $width = 8, int $height = 8): UploadedFile
    {
        $chunk = fn (string $type, string $data) => pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));
        $rows = str_repeat("\0".str_repeat("\xff", $width * 3), $height);

        return UploadedFile::fake()->createWithContent($name, "\x89PNG\r\n\x1a\n"
            .$chunk('IHDR', pack('NNCCCCC', $width, $height, 8, 2, 0, 0, 0))
            .$chunk('IDAT', (string) gzcompress($rows))
            .$chunk('IEND', ''));
    }
}
