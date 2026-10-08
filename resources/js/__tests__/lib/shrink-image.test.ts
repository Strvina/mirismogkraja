import { shrinkImage, shrinkImages } from '@/lib/shrink-image';
import { afterEach, describe, expect, it, vi } from 'vitest';

const KB = 1024;

function file(name: string, type: string, bytes: number, lastModified = 1_700_000_000_000): File {
    return new File([new Uint8Array(bytes)], name, { type, lastModified });
}

/**
 * A browser that can decode an image of the given size and encode the
 * canvas to `encodedBytes` (null: the encoder gives nothing back).
 */
function browserWith({ width, height, encodedBytes }: { width: number; height: number; encodedBytes: number | null }) {
    const bitmap = { width, height, close: vi.fn() };
    const decode = vi.fn().mockResolvedValue(bitmap);
    const drawImage = vi.fn();
    const canvases: HTMLCanvasElement[] = [];

    vi.stubGlobal('createImageBitmap', decode);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
        canvases.push(this);

        return { drawImage } as unknown as CanvasRenderingContext2D;
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, type) =>
        callback(encodedBytes === null ? null : new Blob([new Uint8Array(encodedBytes)], { type })),
    );

    return { bitmap, decode, drawImage, canvas: () => canvases[0] };
}

afterEach(() => vi.unstubAllGlobals());

describe('shrinkImage', () => {
    it('does not touch a file that is not an image', async () => {
        const { decode } = browserWith({ width: 4000, height: 3000, encodedBytes: 100 * KB });
        const document = file('cenovnik.pdf', 'application/pdf', 900 * KB);

        expect(await shrinkImage(document)).toBe(document);
        expect(decode).not.toHaveBeenCalled();
    });

    it('does not touch a GIF, which would lose its animation', async () => {
        const { decode } = browserWith({ width: 4000, height: 3000, encodedBytes: 100 * KB });
        const animation = file('mesanje.gif', 'image/gif', 900 * KB);

        expect(await shrinkImage(animation)).toBe(animation);
        expect(decode).not.toHaveBeenCalled();
    });

    it('leaves a photo alone when it is already small in pixels and in bytes', async () => {
        const { bitmap, drawImage } = browserWith({ width: 1200, height: 900, encodedBytes: 50 * KB });
        const photo = file('sir.jpg', 'image/jpeg', 250 * KB);

        expect(await shrinkImage(photo)).toBe(photo);
        expect(drawImage).not.toHaveBeenCalled();
        expect(bitmap.close).toHaveBeenCalled();
    });

    it('scales a phone photo down to 1600 pixels on its longest side', async () => {
        const { canvas, bitmap } = browserWith({ width: 4000, height: 3000, encodedBytes: 400 * KB });
        const photo = file('ajvar.jpg', 'image/jpeg', 4000 * KB);

        const result = await shrinkImage(photo);

        expect(canvas().width).toBe(1600);
        expect(canvas().height).toBe(1200);
        expect(result).not.toBe(photo);
        expect(result.size).toBe(400 * KB);
        expect(result.type).toBe('image/jpeg');
        expect(result.name).toBe('ajvar.jpg');
        expect(bitmap.close).toHaveBeenCalled();
    });

    it('scales a portrait photo by its height', async () => {
        const { canvas } = browserWith({ width: 3000, height: 4000, encodedBytes: 400 * KB });

        await shrinkImage(file('tegla.jpg', 'image/jpeg', 4000 * KB));

        expect(canvas().width).toBe(1200);
        expect(canvas().height).toBe(1600);
    });

    it('re-encodes a heavy photo without resizing it when its pixels already fit', async () => {
        const { canvas } = browserWith({ width: 1500, height: 1000, encodedBytes: 200 * KB });
        const photo = file('med.jpg', 'image/jpeg', 900 * KB);

        const result = await shrinkImage(photo);

        expect(canvas().width).toBe(1500);
        expect(canvas().height).toBe(1000);
        expect(result.size).toBe(200 * KB);
    });

    it('reads the photo the right way up', async () => {
        const { decode } = browserWith({ width: 4000, height: 3000, encodedBytes: 400 * KB });
        const photo = file('ajvar.jpg', 'image/jpeg', 4000 * KB);

        await shrinkImage(photo);

        expect(decode).toHaveBeenCalledWith(photo, { imageOrientation: 'from-image' });
    });

    it('keeps a PNG a PNG, so a logo keeps its transparent background', async () => {
        browserWith({ width: 3000, height: 3000, encodedBytes: 300 * KB });

        const result = await shrinkImage(file('logo.png', 'image/png', 2000 * KB));

        expect(result.type).toBe('image/png');
        expect(result.name).toBe('logo.png');
    });

    it('turns any other format into a JPEG and renames it to match', async () => {
        browserWith({ width: 4000, height: 3000, encodedBytes: 400 * KB });

        const result = await shrinkImage(file('IMG.0042.HEIC', 'image/heic', 3000 * KB));

        expect(result.type).toBe('image/jpeg');
        expect(result.name).toBe('IMG.0042.jpg');
    });

    it('keeps the time the photo was taken', async () => {
        browserWith({ width: 4000, height: 3000, encodedBytes: 400 * KB });

        const result = await shrinkImage(file('ajvar.jpg', 'image/jpeg', 4000 * KB, 1_600_000_000_000));

        expect(result.lastModified).toBe(1_600_000_000_000);
    });

    it('sends the original when the result is not actually smaller', async () => {
        browserWith({ width: 4000, height: 3000, encodedBytes: 900 * KB });
        const photo = file('ajvar.jpg', 'image/jpeg', 900 * KB);

        expect(await shrinkImage(photo)).toBe(photo);
    });

    it('sends the original when the browser cannot encode the canvas', async () => {
        browserWith({ width: 4000, height: 3000, encodedBytes: null });
        const photo = file('ajvar.jpg', 'image/jpeg', 4000 * KB);

        expect(await shrinkImage(photo)).toBe(photo);
    });

    it('sends the original when the browser cannot read the image at all', async () => {
        vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('unsupported')));
        const photo = file('ajvar.jpg', 'image/jpeg', 4000 * KB);

        expect(await shrinkImage(photo)).toBe(photo);
    });

    it('sends the original in a browser that has no createImageBitmap', async () => {
        vi.stubGlobal('createImageBitmap', undefined);
        const photo = file('ajvar.jpg', 'image/jpeg', 4000 * KB);

        expect(await shrinkImage(photo)).toBe(photo);
    });
});

describe('shrinkImages', () => {
    it('handles each file on its own and keeps their order', async () => {
        browserWith({ width: 4000, height: 3000, encodedBytes: 400 * KB });
        const photo = file('ajvar.jpg', 'image/jpeg', 4000 * KB);
        const animation = file('mesanje.gif', 'image/gif', 900 * KB);

        const [first, second] = await shrinkImages([photo, animation]);

        expect(first.size).toBe(400 * KB);
        expect(second).toBe(animation);
    });

    it('is empty for no files', async () => {
        expect(await shrinkImages([])).toEqual([]);
    });
});
