import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Where images live is module state, set once at start-up: every test
// starts from a module that has not been configured yet.
async function freshMedia() {
    vi.resetModules();

    return import('@/lib/media');
}

describe('mediaUrl and thumbUrl', () => {
    it('serve from /storage until told otherwise', async () => {
        const { mediaUrl } = await freshMedia();

        expect(mediaUrl('producers/logo.jpg')).toBe('/storage/producers/logo.jpg');
    });

    it('use the original where the server makes no small copies', async () => {
        const { thumbUrl } = await freshMedia();

        expect(thumbUrl('producers/logo.jpg')).toBe('/storage/producers/logo.jpg');
    });

    it('follow the address and the thumbnails the server announces', async () => {
        const { configureMedia, mediaUrl, thumbUrl } = await freshMedia();

        configureMedia({ url: 'https://cdn.example.com/media', thumbs: true });

        expect(mediaUrl('products/ajvar.jpg')).toBe('https://cdn.example.com/media/products/ajvar.jpg');
        expect(thumbUrl('products/ajvar.jpg')).toBe('https://cdn.example.com/media/thumbs/products/ajvar.jpg');
    });

    it('keep the defaults when the page carries no media settings', async () => {
        const { configureMedia, thumbUrl } = await freshMedia();

        configureMedia(undefined);

        expect(thumbUrl('a.jpg')).toBe('/storage/a.jpg');
    });
});

describe('installThumbnailFallback', () => {
    let registered: [string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined][] = [];

    beforeEach(() => {
        registered = [];
        const add = document.addEventListener.bind(document);

        vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
            registered.push([type, listener, options]);
            add(type, listener, options);
        });
    });

    afterEach(() => {
        registered.forEach(([type, listener, options]) => document.removeEventListener(type, listener, options));
        document.body.innerHTML = '';
    });

    function image(src: string): HTMLImageElement {
        const element = document.createElement('img');

        element.setAttribute('src', src);
        document.body.appendChild(element);

        return element;
    }

    const fail = (element: Element) => element.dispatchEvent(new Event('error'));

    it('swaps a small copy that fails to load for the original', async () => {
        const { configureMedia, installThumbnailFallback } = await freshMedia();

        configureMedia({ url: '/storage', thumbs: true });
        installThumbnailFallback();

        const picture = image('/storage/thumbs/products/ajvar.jpg');
        fail(picture);

        expect(picture.getAttribute('src')).toBe('/storage/products/ajvar.jpg');
    });

    it('does not try again when the original fails as well', async () => {
        const { installThumbnailFallback } = await freshMedia();

        installThumbnailFallback();

        const picture = image('/storage/thumbs/a.jpg');
        fail(picture);
        fail(picture);

        expect(picture.getAttribute('src')).toBe('/storage/a.jpg');
    });

    it('leaves alone an image that is not one of ours', async () => {
        const { installThumbnailFallback } = await freshMedia();

        installThumbnailFallback();

        const picture = image('https://example.com/thumbs/a.jpg');
        fail(picture);

        expect(picture.getAttribute('src')).toBe('https://example.com/thumbs/a.jpg');
    });

    it('ignores anything that is not an image', async () => {
        const { installThumbnailFallback } = await freshMedia();

        installThumbnailFallback();

        const script = document.createElement('script');
        script.setAttribute('src', '/storage/thumbs/a.js');
        document.body.appendChild(script);

        expect(() => fail(script)).not.toThrow();
        expect(script.getAttribute('src')).toBe('/storage/thumbs/a.js');
    });

    it('follows the address configured after it was installed', async () => {
        const { configureMedia, installThumbnailFallback } = await freshMedia();

        installThumbnailFallback();
        configureMedia({ url: 'https://cdn.example.com', thumbs: true });

        const picture = image('https://cdn.example.com/thumbs/a.jpg');
        fail(picture);

        expect(picture.getAttribute('src')).toBe('https://cdn.example.com/a.jpg');
    });
});
