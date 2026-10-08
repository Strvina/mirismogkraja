import { lastVisit } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import AdminLayout from '@/layouts/admin-layout';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const sections = () => screen.getByRole('navigation', { name: 'Admin sekcije' });
const currentSections = () =>
    within(sections())
        .queryAllByRole('link', { current: 'page' })
        .map((link) => link.textContent);

const renderAt = (url: string) => renderOnPage(<AdminLayout title="Naslov">Sadržaj</AdminLayout>, { url });

describe('AdminLayout', () => {
    it('titles the section and holds its content', () => {
        renderOnPage(
            <AdminLayout title="Članarine">
                <p>Tri uplate čekaju.</p>
            </AdminLayout>,
            { url: '/admin/clanarine' },
        );

        expect(screen.getByRole('heading', { level: 1, name: 'Članarine' })).toBeVisible();
        expect(within(screen.getByRole('main')).getByText('Tri uplate čekaju.')).toBeVisible();
    });

    it('lists every section of the panel', () => {
        renderAt('/admin');

        expect(within(sections()).getAllByRole('link')).toHaveLength(18);
        expect(within(sections()).getByRole('link', { name: 'Proizvođači' })).toHaveAttribute('href', '/admin/proizvodjaci');
        expect(within(sections()).getByRole('link', { name: 'Šta kupci traže' })).toHaveAttribute('href', '/admin/pretrage');
    });

    describe('the current section', () => {
        it.each([
            ['/admin', 'Evidencija'],
            ['/admin/', 'Evidencija'],
            ['/admin?period=30', 'Evidencija'],
            ['/admin/proizvodjaci', 'Proizvođači'],
            ['/admin/proizvodjaci?status=pending', 'Proizvođači'],
            ['/admin/proizvodjaci/12', 'Proizvođači'],
            ['/admin/proizvodi', 'Proizvodi'],
            ['/admin/price', 'Priče i recepti'],
            ['/admin/clanarine?status=settings', 'Članarine'],
            ['/admin/isticanja', 'Isticanja'],
            ['/admin/pretrage#lista', 'Šta kupci traže'],
        ])('on %s is "%s", and only that one', (url, section) => {
            renderAt(url);

            expect(currentSections()).toEqual([section]);
        });

        it('is not the dashboard on every page under /admin', () => {
            renderAt('/admin/korisnici');

            expect(currentSections()).toEqual(['Korisnici']);
        });

        it('is none for an address that only starts like a section', () => {
            renderAt('/admin/proizvodjaci-arhiva');

            expect(currentSections()).toEqual([]);
        });
    });

    it('opens and closes the section list from the menu button on a phone', async () => {
        const { user } = renderAt('/admin');
        const panel = sections().parentElement as HTMLElement;

        expect(panel).toHaveClass('hidden');

        await user.click(screen.getByRole('button', { name: 'Admin meni' }));
        expect(panel).not.toHaveClass('hidden');

        await user.click(within(sections()).getByRole('link', { name: 'Korisnici' }));
        expect(panel).toHaveClass('hidden');
        expect(lastVisit()).toMatchObject({ method: 'get', url: '/admin/korisnici' });
    });

    it('offers the way back to the site, and signing out with a POST', async () => {
        const { user } = renderAt('/admin');

        expect(screen.getByRole('link', { name: 'Nazad na sajt' })).toHaveAttribute('href', '/');

        await user.click(screen.getByRole('button', { name: 'Odjava' }));

        expect(lastVisit()).toMatchObject({ method: 'post', url: route('logout') });
    });
});
