/**
 * Addresses of uploaded images (see App\Support\Media).
 *
 * mediaUrl() is the image as uploaded - for the big views. thumbUrl() is the
 * small copy made for cards and lists, when the server makes them; an image
 * uploaded before that has none, and falls back to the original by itself
 * (see installThumbnailFallback).
 */
let base = '/storage';
let thumbs = false;

/** Set once at start-up from the shared "media" prop. */
export function configureMedia(config: { url: string; thumbs: boolean } | undefined): void {
    if (config) {
        base = config.url;
        thumbs = config.thumbs;
    }
}

export function mediaUrl(path: string): string {
    return `${base}/${path}`;
}

export function thumbUrl(path: string): string {
    return thumbs ? `${base}/thumbs/${path}` : mediaUrl(path);
}

/**
 * One listener for the whole app: a small copy that fails to load is
 * swapped for the original. Error events do not bubble, so it listens in
 * the capture phase.
 */
export function installThumbnailFallback(): void {
    const prefix = () => `${base}/thumbs/`;

    document.addEventListener(
        'error',
        (event) => {
            const image = event.target;

            if (!(image instanceof HTMLImageElement)) {
                return;
            }

            const src = image.getAttribute('src') ?? '';

            if (src.startsWith(prefix())) {
                image.src = `${base}/${src.slice(prefix().length)}`;
            }
        },
        true,
    );
}
