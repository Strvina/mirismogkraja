import { makeUser } from '@/__tests__/support/factories';
import { emitRouterEvent } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { loadLocale } from '@/lib/i18n';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const goTo = (address: string) => window.history.pushState(null, '', address);

// Whether the visitor has moved around the site yet only goes one way, as in
// a browser tab: the first tests are the page they loaded.
describe('MarketplaceLayout', () => {
    it('wraps every page in the same header and footer', () => {
        renderOnPage(
            <MarketplaceLayout>
                <h1>Proizvodi</h1>
            </MarketplaceLayout>,
        );

        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
        expect(within(screen.getByRole('main')).getByRole('heading', { name: 'Proizvodi' })).toBeVisible();
    });

    it('paints the page a visitor loaded as it is, with no entrance', () => {
        renderOnPage(<MarketplaceLayout>Sadržaj</MarketplaceLayout>);

        expect(screen.getByRole('main')).not.toHaveClass('page-enter');
    });

    it('reminds a signed-in visitor who has not confirmed their address', () => {
        renderOnPage(<MarketplaceLayout>Sadržaj</MarketplaceLayout>, {
            props: { auth: { user: makeUser({ email_verified_at: null }) } },
        });

        expect(screen.getByRole('link', { name: 'Niste dobili mejl?' })).toBeInTheDocument();
    });

    describe('the path', () => {
        const path = () => screen.getByRole('navigation', { name: 'Putanja' });

        const crumbs = [
            { title: 'Proizvodi', href: '/proizvodi' },
            { title: 'Zimnica', href: '/kategorija/zimnica' },
            { title: 'Domaći ajvar', href: '/proizvod/domaci-ajvar' },
        ];

        it('is not there on a page that has none', () => {
            renderOnPage(<MarketplaceLayout breadcrumbs={[]}>Sadržaj</MarketplaceLayout>);

            expect(screen.queryByRole('navigation', { name: 'Putanja' })).not.toBeInTheDocument();
        });

        it('links every step back up, and names the page itself without a link', () => {
            renderOnPage(<MarketplaceLayout breadcrumbs={crumbs}>Sadržaj</MarketplaceLayout>);

            expect(
                within(path())
                    .getAllByRole('link')
                    .map((link) => [link.textContent, link.getAttribute('href')]),
            ).toEqual([
                ['Proizvodi', '/proizvodi'],
                ['Zimnica', '/kategorija/zimnica'],
            ]);
            expect(path()).toHaveTextContent('ProizvodiZimnicaDomaći ajvar');
        });

        it('shows a page at the top of the site as its own name alone', () => {
            renderOnPage(<MarketplaceLayout breadcrumbs={[{ title: 'Poruke', href: '/poruke' }]}>Sadržaj</MarketplaceLayout>);

            expect(within(path()).queryByRole('link')).not.toBeInTheDocument();
            expect(path()).toHaveTextContent(/^Poruke$/);
        });

        it("translates the titles that are the site's own words", async () => {
            await loadLocale('en');
            renderOnPage(<MarketplaceLayout breadcrumbs={[{ title: 'Poruke', href: '/poruke' }]}>Sadržaj</MarketplaceLayout>);

            expect(screen.getAllByRole('navigation').some((nav) => nav.textContent === 'Poruke')).toBe(false);
        });

        it('is left out of a page built of edge-to-edge sections', () => {
            renderOnPage(
                <MarketplaceLayout breadcrumbs={crumbs} fullBleed>
                    Sadržaj
                </MarketplaceLayout>,
            );

            expect(screen.queryByRole('navigation', { name: 'Putanja' })).not.toBeInTheDocument();
            expect(screen.getByRole('main')).toHaveAttribute('id', 'top');
        });
    });

    describe('once the visitor moves around the site', () => {
        it('eases in a page reached from another page', () => {
            goTo('/proizvodi');
            emitRouterEvent('start');
            goTo('/proizvodjaci');

            renderOnPage(<MarketplaceLayout>Sadržaj</MarketplaceLayout>);

            expect(screen.getByRole('main')).toHaveClass('page-enter');
        });

        it('does not ease in the same page again when only its list changed', () => {
            goTo('/proizvodi');
            emitRouterEvent('start');
            goTo('/proizvodi?page=2');

            renderOnPage(<MarketplaceLayout>Sadržaj</MarketplaceLayout>);

            expect(screen.getByRole('main')).not.toHaveClass('page-enter');
        });

        it('decides once: a page that eased in keeps its place when filtered afterwards', () => {
            goTo('/proizvodi');
            emitRouterEvent('start');
            goTo('/proizvodjaci');

            const { rerender } = renderOnPage(<MarketplaceLayout>Sadržaj</MarketplaceLayout>);

            emitRouterEvent('start');
            goTo('/proizvodjaci?grad=Ni%C5%A1');
            rerender(<MarketplaceLayout>Filtrirano</MarketplaceLayout>);

            expect(screen.getByRole('main')).toHaveClass('page-enter');
        });
    });
});
