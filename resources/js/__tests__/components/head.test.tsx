import { renderOnPage } from '@/__tests__/support/render';
import Head from '@/components/head';
import { describe, expect, it } from 'vitest';

describe('Head', () => {
    it('keeps the title the server wrote, whatever the page passes', () => {
        renderOnPage(<Head title="Proizvodi" />, { props: { meta: { title: 'Domaći ajvar — cena i prodaja | Vrelina juga' } } });

        expect(document.title).toBe('Domaći ajvar — cena i prodaja | Vrelina juga');
    });

    it("keeps the server's title on a page that passes none", () => {
        renderOnPage(<Head />, { props: { meta: { title: 'Mlekara Zapis | Vrelina juga' } } });

        expect(document.title).toBe('Mlekara Zapis | Vrelina juga');
    });

    it("puts the site's name after the page's own title when the server wrote none", () => {
        renderOnPage(<Head title="Moje poruke" />);

        expect(document.title).toBe('Moje poruke - Vrelina juga');
    });

    it("falls back to the site's name alone", () => {
        renderOnPage(<Head />);

        expect(document.title).toBe('Vrelina juga');
    });

    it('titles the page itself when the server sent meta without a title', () => {
        renderOnPage(<Head title="Moj nalog" />, { props: { meta: { robots: 'noindex, follow' } } });

        expect(document.title).toBe('Moj nalog - Vrelina juga');
    });
});
