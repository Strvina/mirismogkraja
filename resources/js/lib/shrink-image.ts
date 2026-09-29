/**
 * Photos are made smaller in the browser before they are uploaded.
 *
 * A phone photo is 3-6 MB at 4000px, and every catalog card, gallery and
 * review sent it to every visitor as it was - on a phone connection that is
 * the slowest thing on the site. The server could resize them too, but that
 * needs an image extension (GD or Imagick) the host may not have; the
 * browser always has a canvas. The upload also gets faster, and the server's
 * size limit stops being something people run into.
 *
 * Never allowed to cost an upload: if anything here fails, or the result is
 * not actually smaller, the original file goes as it was.
 */

/** Longest side, in pixels - sharp on a large screen, a fraction of the bytes. */
const MAX_SIDE = 1600;

/** Files already this small and within MAX_SIDE are left alone. */
const SMALL_ENOUGH = 300 * 1024;

const JPEG_QUALITY = 0.85;

export async function shrinkImage(file: File): Promise<File> {
    // An animated GIF would lose its animation, and anything that is not an
    // image is for the server's validation to refuse, not for us to touch.
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
        return file;
    }

    try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));

        if (scale === 1 && file.size <= SMALL_ENOUGH) {
            bitmap.close();
            return file;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();

        // PNG stays PNG: a logo's transparent background would turn black
        // as a JPEG. Everything else - photos - becomes a JPEG, which every
        // browser can encode and every browser can show.
        const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, JPEG_QUALITY));

        if (!blob || blob.size >= file.size) {
            return file;
        }

        const name = type === 'image/jpeg' ? file.name.replace(/\.[^.]+$/, '') + '.jpg' : file.name;

        return new File([blob], name, { type, lastModified: file.lastModified });
    } catch {
        return file;
    }
}

export function shrinkImages(files: File[]): Promise<File[]> {
    return Promise.all(files.map(shrinkImage));
}
