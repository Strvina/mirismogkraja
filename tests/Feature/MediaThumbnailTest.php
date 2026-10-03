<?php

namespace Tests\Feature;

use App\Support\Media;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * The small copies themselves. Needs GD, which CI has; on a machine
 * without it these are skipped and pages fall back to the originals.
 */
class MediaThumbnailTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (! extension_loaded('gd')) {
            $this->markTestSkipped('GD is not installed.');
        }

        Storage::fake('public');
    }

    public function test_an_upload_gets_a_small_copy_of_the_same_shape(): void
    {
        $path = Media::store(UploadedFile::fake()->image('wide.jpg', 1600, 800), 'products');

        [$width, $height] = getimagesizefromstring(Storage::disk('public')->get(Media::thumbPath($path)));
        $this->assertSame([Media::THUMB_SIDE, Media::THUMB_SIDE / 2], [$width, $height]);
    }

    public function test_a_small_image_is_not_enlarged(): void
    {
        $path = Media::store(UploadedFile::fake()->image('small.png', 200, 100), 'products');

        $this->assertSame([200, 100], array_slice(getimagesizefromstring(Storage::disk('public')->get(Media::thumbPath($path))), 0, 2));
    }

    public function test_a_source_too_large_to_decode_safely_gets_no_copy(): void
    {
        $this->assertFalse(Media::makeThumbnail('products/huge.png', $this->pngClaiming(5000, 5000)));
    }

    private function pngClaiming(int $width, int $height): string
    {
        $chunk = fn (string $type, string $data) => pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));

        return "\x89PNG\r\n\x1a\n".$chunk('IHDR', pack('NNCCCCC', $width, $height, 8, 2, 0, 0, 0)).$chunk('IEND', '');
    }
}
