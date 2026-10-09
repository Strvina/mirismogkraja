import { renderOnPage } from '@/__tests__/support/render';
import SettingsLayout from '@/layouts/settings/layout';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const tabs = () => within(screen.getByRole('navigation', { name: 'Podešavanja naloga' })).getAllByRole('link');

describe('SettingsLayout', () => {
    it('titles the account pages and holds the open one', () => {
        renderOnPage(
            <SettingsLayout>
                <p>Lični podaci</p>
            </SettingsLayout>,
            { url: '/settings/profile' },
        );

        expect(screen.getByRole('heading', { level: 1, name: 'Moj nalog' })).toBeVisible();
        expect(screen.getByText('Lični podaci')).toBeVisible();
    });

    it('links the four pages of the account', () => {
        renderOnPage(<SettingsLayout>Sadržaj</SettingsLayout>, { url: '/settings/profile' });

        expect(tabs().map((tab) => [tab.textContent, tab.getAttribute('href')])).toEqual([
            ['Profil', '/settings/profile'],
            ['Lozinka', '/settings/password'],
            ['Dvostruka potvrda', '/settings/two-factor'],
            ['Izgled', '/settings/appearance'],
        ]);
    });

    it.each([
        ['/settings/profile', 'Profil'],
        ['/settings/password', 'Lozinka'],
        ['/settings/two-factor?setup=1', 'Dvostruka potvrda'],
        ['/settings/appearance', 'Izgled'],
    ])('highlights the page that is open at %s', (url, open) => {
        renderOnPage(<SettingsLayout>Sadržaj</SettingsLayout>, { url });

        const highlighted = tabs()
            .filter((tab) => tab.classList.contains('bg-olive-soft'))
            .map((tab) => tab.textContent);

        expect(highlighted).toEqual([open]);
    });
});
