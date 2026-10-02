<?php

namespace App\Console\Commands;

use App\Support\Media;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Small copies for images uploaded before they were made - or on a server
 * that had no GD at the time. Safe to run again: an image that already has
 * its copy is skipped, so it only does the work that is missing.
 */
class GenerateThumbnails extends Command
{
    protected $signature = 'media:thumbnails';

    protected $description = 'Make the small card-size copies of uploaded images that do not have one yet';

    /** Every column that holds an uploaded image's path. */
    private const COLUMNS = [
        ['product_images', 'path'],
        ['producer_images', 'path'],
        ['households', 'cover_image_path'],
        ['households', 'logo_path'],
        ['users', 'avatar_path'],
        ['reviews', 'image_path'],
    ];

    public function handle(): int
    {
        if (! Media::thumbnailsEnabled()) {
            $this->error('PHP GD ekstenzija nije uključena - male kopije ne mogu da se naprave na ovom serveru.');

            return self::FAILURE;
        }

        $made = 0;
        $disk = Media::disk();

        foreach (self::COLUMNS as [$table, $column]) {
            // By id in chunks: the tables can be large, and only paths are read.
            DB::table($table)->whereNotNull($column)->select(['id', $column])->chunkById(500, function ($rows) use ($disk, $column, &$made) {
                foreach ($rows as $row) {
                    $path = $row->{$column};

                    if ($disk->exists(Media::thumbPath($path)) || ! $disk->exists($path)) {
                        continue;
                    }

                    $made += (int) Media::makeThumbnail($path, (string) $disk->get($path));
                }
            });
        }

        $this->info("Napravljeno malih kopija: {$made}.");

        return self::SUCCESS;
    }
}
