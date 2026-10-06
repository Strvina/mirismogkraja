<?php

namespace App\Support;

use GdImage;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Every uploaded image - covers, logos, galleries, product photos, review
 * photos, avatars - is stored, deleted and addressed through here.
 *
 * The disk is a setting (MEDIA_DISK): "public" on one server today, "s3" or
 * any other shared store once there is more than one, without touching the
 * code. Next to each image a small copy is kept under thumbs/ for the
 * cards and lists, which would otherwise download a 1600px photo to show a
 * 300px tile. Making the copy needs PHP's GD extension; where it is missing
 * the image is simply stored alone and the pages show the original.
 */
final class Media
{
    /** Longest side of the small copy: a card at twice its CSS size. */
    public const THUMB_SIDE = 480;

    /**
     * The largest side an upload may have. The site's own forms shrink
     * photos to 1600px before sending, so this only stops a crafted file -
     * a few megabytes of PNG can claim 20000x20000 pixels, which GD would
     * try to hold in memory at four bytes each.
     */
    public const MAX_SIDE = 5000;

    /** Above this, no small copy is made (decoding would need too much memory). */
    private const MAX_THUMB_SOURCE_PIXELS = 20_000_000;

    private const THUMB_DIRECTORY = 'thumbs';

    public static function diskName(): string
    {
        return (string) config('filesystems.media', 'public');
    }

    public static function disk(): Filesystem
    {
        return Storage::disk(self::diskName());
    }

    /** Store an upload under $directory, with its small copy; returns the path to save. */
    /**
     * Validation rules for an uploaded photo.
     *
     * @return array<int, string>
     */
    public static function imageRules(int $maxKilobytes = 4096): array
    {
        return ['image', 'max:'.$maxKilobytes, 'dimensions:max_width='.self::MAX_SIDE.',max_height='.self::MAX_SIDE];
    }

    public static function store(UploadedFile $file, string $directory): string
    {
        $path = $file->store($directory, self::diskName());

        self::makeThumbnail($path, (string) file_get_contents($file->getRealPath()));

        return $path;
    }

    /** Delete images and their small copies. Nulls are skipped. */
    public static function delete(string|array|null $paths): void
    {
        $paths = array_values(array_filter((array) $paths));

        if ($paths !== []) {
            self::disk()->delete([...$paths, ...array_map(self::thumbPath(...), $paths)]);
        }
    }

    public static function thumbPath(string $path): string
    {
        return self::THUMB_DIRECTORY.'/'.$path;
    }

    /** Whether new uploads get a small copy on this server. */
    public static function thumbnailsEnabled(): bool
    {
        return extension_loaded('gd');
    }

    /**
     * Where the browser finds the images: "/storage" on the public disk -
     * relative, so it works on whatever host the site is opened on - or
     * the disk's own address (a bucket, a CDN) otherwise.
     */
    public static function baseUrl(): string
    {
        return self::diskName() === 'public' ? '/storage' : rtrim(self::disk()->url(''), '/');
    }

    /**
     * The address the page itself uses for an image - the same string the
     * browser builds (mediaUrl in resources/js/lib/media.ts), so a preload
     * of it and the <img> that follows are one request, not two.
     */
    public static function url(string $path): string
    {
        return self::baseUrl().'/'.$path;
    }

    /** A full address, for places outside the page such as og:image. */
    public static function absoluteUrl(string $path): string
    {
        $url = self::baseUrl().'/'.$path;

        return str_starts_with($url, '/') ? url($url) : $url;
    }

    /**
     * Draw the small copy. Quietly does nothing without GD or for a file GD
     * cannot read - the original is always there to fall back on.
     */
    public static function makeThumbnail(string $path, string $contents): bool
    {
        if (! self::thumbnailsEnabled() || $contents === '') {
            return false;
        }

        $size = @getimagesizefromstring($contents);

        if ($size === false || $size[0] * $size[1] > self::MAX_THUMB_SOURCE_PIXELS) {
            return false;
        }

        $image = @imagecreatefromstring($contents);

        if (! $image instanceof GdImage) {
            return false;
        }

        $image = self::upright($image, $contents);

        $width = imagesx($image);
        $height = imagesy($image);
        $scale = min(1, self::THUMB_SIDE / max($width, $height, 1));
        $thumb = imagecreatetruecolor(max(1, (int) round($width * $scale)), max(1, (int) round($height * $scale)));

        // Keep transparency for PNG and WebP logos.
        imagealphablending($thumb, false);
        imagesavealpha($thumb, true);
        imagecopyresampled($thumb, $image, 0, 0, 0, 0, imagesx($thumb), imagesy($thumb), $width, $height);

        ob_start();
        match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'png' => imagepng($thumb, null, 6),
            'webp' => imagewebp($thumb, null, 80),
            'gif' => imagegif($thumb),
            default => imagejpeg($thumb, null, 80),
        };
        $data = (string) ob_get_clean();

        imagedestroy($image);
        imagedestroy($thumb);

        return $data !== '' && self::disk()->put(self::thumbPath($path), $data);
    }

    /**
     * A phone stores a photo as the sensor saw it, plus an EXIF note on how
     * to turn it. Browsers follow the note; GD does not, and the copy it
     * writes has no note left - so a portrait photo's thumbnail would lie on
     * its side. The turn is applied to the pixels here instead.
     */
    private static function upright(GdImage $image, string $contents): GdImage
    {
        if (! function_exists('exif_read_data') || ! str_starts_with($contents, "\xFF\xD8")) {
            return $image;
        }

        $exif = @exif_read_data('data://image/jpeg;base64,'.base64_encode($contents));
        $orientation = (int) ($exif['Orientation'] ?? 1);

        // 2, 4, 5 and 7 are mirrored versions of 1, 3, 6 and 8.
        if (in_array($orientation, [2, 4, 5, 7], true)) {
            imageflip($image, $orientation === 4 ? IMG_FLIP_VERTICAL : IMG_FLIP_HORIZONTAL);
        }

        $angle = match ($orientation) {
            3, 4 => 180,
            5, 6 => -90,
            7, 8 => 90,
            default => 0,
        };

        if ($angle === 0) {
            return $image;
        }

        $turned = imagerotate($image, $angle, 0);

        return $turned instanceof GdImage ? $turned : $image;
    }
}
