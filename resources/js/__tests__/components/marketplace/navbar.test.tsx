import { makeUser } from '@/__tests__/support/factories';
import { lastVisit, pollRequests, visits } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import Navbar from '@/components/marketplace/navbar';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const signedIn = { auth: { user: makeUser({ name: 'Milica Nikolić' }) } };

const mainNav = () => screen.getByRole('navigation', { name: 'Glavna navigacija' });

/** The names of the links marked as the current page, anywhere in the header. */
const currentPages = () => screen.queryAllByRole('link', { current: 'page' }).map((link) => link.textContent || link.getAttribute('aria-label'));

describe('Navbar', () => {
    describe('for a guest', () => {
        it('offers the four sections, "Kako radi", sign-in and sign-up', () => {
            renderOnPage(<Navbar />);

            expect(
                within(mainNav())
                    .getAllByRole('link')
                    .map((link) => link.textContent),
            ).toEqual(['Proizvođači', 'Proizvodi', 'Priče i recepti', 'Tražim', 'Kako radi']);
            expect(screen.getByRole('link', { name: 'Prijava' })).toHaveAttribute('href', route('login'));
            expect(screen.getByRole('link', { name: 'Otvori nalog' })).toHaveAttribute('href', route('register'));
        });

        it('has no inbox, no bell and no account menu', () => {
            renderOnPage(<Navbar />);

            expect(screen.queryByRole('link', { name: /^Poruke/ })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /^Obaveštenja/ })).not.toBeInTheDocument();
            expect(screen.queryByRole('link', { name: 'Sačuvano' })).not.toBeInTheDocument();
        });

        it('folds everything into one menu where the header has no room', async () => {
            const { user } = renderOnPage(<Navbar />);

            await user.click(screen.getByRole('button', { name: 'Meni' }));

            expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
                'Proizvođači',
                'Proizvodi',
                'Priče i recepti',
                'Tražim',
                'Prijava',
                'Otvori nalog',
            ]);
        });

        it('does not poll for badges it has no use for', () => {
            renderOnPage(<Navbar />);

            expect(pollRequests()).toEqual([
                { interval: 30_000, requestOptions: { only: ['unreadMessages', 'unreadNotifications'] }, options: { autoStart: false } },
            ]);
        });
    });

    describe('for someone signed in', () => {
        it('swaps sign-in for the inbox, the bell, saved items and the account menu', () => {
            renderOnPage(<Navbar />, { props: { ...signedIn, unreadMessages: 2 } });

            expect(screen.queryByRole('link', { name: 'Prijava' })).not.toBeInTheDocument();
            expect(screen.queryByRole('link', { name: 'Otvori nalog' })).not.toBeInTheDocument();
            expect(screen.getByRole('link', { name: 'Poruke (2 nepročitanih)' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Obaveštenja' })).toBeInTheDocument();
            expect(screen.getByRole('link', { name: 'Sačuvano' })).toHaveAttribute('href', route('favorites.index'));
            expect(screen.getByRole('button', { name: /Meni/ })).toHaveTextContent('Milica');
        });

        it('drops "Kako radi" from the header: they have used the site already', () => {
            renderOnPage(<Navbar />, { props: signedIn });

            expect(within(mainNav()).queryByRole('link', { name: 'Kako radi' })).not.toBeInTheDocument();
        });

        it('checks both badges with one request every thirty seconds', () => {
            renderOnPage(<Navbar />, { props: signedIn });

            expect(pollRequests()).toEqual([
                { interval: 30_000, requestOptions: { only: ['unreadMessages', 'unreadNotifications'] }, options: { autoStart: true } },
            ]);
        });
    });

    describe('the current section', () => {
        it.each([
            ['/proizvodjaci', 'Proizvođači'],
            ['/proizvodjaci?grad=Ni%C5%A1', 'Proizvođači'],
            ['/proizvodjaci/', 'Proizvođači'],
            ['/proizvodjac/mlekara-zapis', 'Proizvođači'],
            ['/proizvodi', 'Proizvodi'],
            ['/proizvodi?q=ajvar&page=2', 'Proizvodi'],
            ['/proizvod/domaci-ajvar', 'Proizvodi'],
            ['/proizvod/domaci-ajvar#utisci', 'Proizvodi'],
            ['/price', 'Priče i recepti'],
            ['/price/kako-se-pece-ajvar', 'Priče i recepti'],
            ['/trazim', 'Tražim'],
            ['/trazim/12', 'Tražim'],
            ['/kako-radi', 'Kako radi'],
        ])('on %s is "%s", and nothing else', (url, section) => {
            renderOnPage(<Navbar />, { url });

            expect(currentPages()).toEqual([section]);
        });

        it.each(['/', '/kategorija/zimnica', '/poruke', '/moji-proizvodjaci', '/proizvodjacima', '/trazimo'])('is none of them on %s', (url) => {
            renderOnPage(<Navbar />, { url });

            expect(currentPages()).toEqual([]);
        });

        it('marks saved items for someone signed in', () => {
            renderOnPage(<Navbar />, { url: '/omiljeni', props: signedIn });

            expect(currentPages()).toEqual(['Sačuvano']);
        });
    });

    describe('search', () => {
        it('goes to the catalogue with what was typed', async () => {
            const { user } = renderOnPage(<Navbar />);

            await user.type(screen.getByRole('searchbox'), '  domaći ajvar {Enter}');

            expect(lastVisit()).toMatchObject({ method: 'get', url: '/proizvodi', data: { q: 'domaći ajvar' } });
        });

        it('goes to the whole catalogue when nothing was typed', async () => {
            const { user } = renderOnPage(<Navbar />);

            await user.type(screen.getByRole('searchbox'), '{Enter}');

            expect(lastVisit()).toMatchObject({ method: 'get', url: '/proizvodi', data: {} });
            expect(lastVisit().data).not.toHaveProperty('q');
        });

        it('opens a search row of its own from the icon, with the cursor in it', async () => {
            const { user } = renderOnPage(<Navbar />);
            const toggle = screen.getByRole('button', { name: 'Pretraga' });

            expect(toggle).toHaveAttribute('aria-expanded', 'false');
            expect(screen.getAllByRole('searchbox')).toHaveLength(1);

            await user.click(toggle);

            expect(toggle).toHaveAttribute('aria-expanded', 'true');
            expect(screen.getAllByRole('searchbox')).toHaveLength(2);
            expect(screen.getAllByRole('searchbox')[1]).toHaveFocus();
        });

        it('folds that row away again after a search, or on a second click', async () => {
            const { user } = renderOnPage(<Navbar />);
            const toggle = screen.getByRole('button', { name: 'Pretraga' });

            await user.click(toggle);
            await user.type(screen.getAllByRole('searchbox')[1], 'med{Enter}');

            expect(visits()).toHaveLength(1);
            expect(lastVisit()).toMatchObject({ url: '/proizvodi', data: { q: 'med' } });
            expect(toggle).toHaveAttribute('aria-expanded', 'false');
            expect(screen.getAllByRole('searchbox')).toHaveLength(1);

            await user.click(toggle);
            await user.click(toggle);

            expect(screen.getAllByRole('searchbox')).toHaveLength(1);
        });
    });
});
