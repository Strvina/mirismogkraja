import { makeUser } from '@/__tests__/support/factories';
import { lastVisit } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import AccountMenu from '@/components/marketplace/account-menu';
import { type User } from '@/types';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

/** The links every visitor has on a phone, where the header's own links fold into this menu. */
const BROWSE = ['Proizvođači', 'Proizvodi', 'Priče i recepti', 'Tražim', 'Kako radi'];

async function openMenu(user: User, props: Record<string, unknown> = {}) {
    const view = renderOnPage(<AccountMenu user={user} />, { props });

    await view.user.click(screen.getByRole('button', { name: /Meni/ }));

    return view;
}

const items = () => screen.getAllByRole('menuitem').map((item) => item.textContent);

describe('AccountMenu', () => {
    it('is opened by a button that carries the first name only', () => {
        renderOnPage(<AccountMenu user={makeUser({ name: 'Milica Nikolić' })} />);

        const button = screen.getByRole('button', { name: /Meni/ });

        expect(button).toHaveTextContent('Milica');
        expect(button).not.toHaveTextContent('Nikolić');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('shows who is signed in, with an initial where there is no photo', async () => {
        await openMenu(makeUser({ name: 'milica Nikolić', email: 'milica@example.com' }));

        const menu = screen.getByRole('menu');

        expect(menu).toHaveTextContent('milica Nikolić');
        expect(menu).toHaveTextContent('milica@example.com');
        expect(menu).toHaveTextContent(/^M/);
        expect(menu.querySelector('img')).toBeNull();
    });

    it('shows the photo of someone who has one', async () => {
        await openMenu(makeUser({ avatar_path: 'avatars/milica.jpg' }));

        expect(screen.getByRole('menu').querySelector('img')).toHaveAttribute('src', '/storage/avatars/milica.jpg');
    });

    it('gives a buyer their own pages and nothing a seller pays for', async () => {
        await openMenu(makeUser({ role: 'buyer' }));

        expect(items()).toEqual([...BROWSE, 'Poruke', 'Obaveštenja', 'Omiljeni', 'Moji proizvođači', 'Moj nalog', 'Odjava']);
    });

    it('adds membership, boosts and campaigns for a seller', async () => {
        await openMenu(makeUser({ role: ['buyer', 'seller'] }));

        expect(items()).toEqual([
            ...BROWSE,
            'Poruke',
            'Obaveštenja',
            'Omiljeni',
            'Moji proizvođači',
            'Članarina',
            'Isticanje',
            'Kampanje',
            'Moj nalog',
            'Odjava',
        ]);
    });

    it('adds the admin panel for an admin, and only for an admin', async () => {
        await openMenu(makeUser({ role: 'admin' }));

        expect(items()).toEqual([...BROWSE, 'Poruke', 'Obaveštenja', 'Omiljeni', 'Moji proizvođači', 'Moj nalog', 'Admin panel', 'Odjava']);
        expect(screen.getByRole('menuitem', { name: 'Admin panel' })).toHaveAttribute('href', route('admin.dashboard'));
    });

    it('treats an account with no roles at all as a buyer', async () => {
        await openMenu(makeUser({ roles: undefined }));

        expect(items()).not.toContain('Članarina');
        expect(items()).not.toContain('Admin panel');
    });

    it('counts what is waiting, next to where it waits', async () => {
        await openMenu(makeUser(), { unreadMessages: 3, unreadNotifications: 12 });

        expect(screen.getByRole('menuitem', { name: /Poruke/ })).toHaveTextContent('Poruke3');
        expect(screen.getByRole('menuitem', { name: /Obaveštenja/ })).toHaveTextContent('Obaveštenja12');
    });

    it('shows no count when nothing is waiting', async () => {
        await openMenu(makeUser(), { unreadMessages: 0, unreadNotifications: 0 });

        expect(screen.getByRole('menuitem', { name: /Poruke/ })).toHaveTextContent(/^Poruke$/);
        expect(screen.getByRole('menuitem', { name: /Obaveštenja/ })).toHaveTextContent(/^Obaveštenja$/);
    });

    it('stops counting at 99', async () => {
        await openMenu(makeUser(), { unreadMessages: 100, unreadNotifications: 99 });

        expect(screen.getByRole('menuitem', { name: /Poruke/ })).toHaveTextContent('Poruke99+');
        expect(screen.getByRole('menuitem', { name: /Obaveštenja/ })).toHaveTextContent('Obaveštenja99');
    });

    it('leads to the right pages', async () => {
        await openMenu(makeUser({ role: 'seller' }));

        const link = (name: string | RegExp) => screen.getByRole('menuitem', { name });

        expect(link('Poruke')).toHaveAttribute('href', route('messages.index'));
        expect(link('Obaveštenja')).toHaveAttribute('href', route('notifications.index'));
        expect(link('Omiljeni')).toHaveAttribute('href', route('favorites.index'));
        expect(link('Moji proizvođači')).toHaveAttribute('href', route('producers.index'));
        expect(link('Članarina')).toHaveAttribute('href', route('memberships.index'));
        expect(link('Moj nalog')).toHaveAttribute('href', route('profile.edit'));
    });

    it('signs out with a POST, not by following a link', async () => {
        const { user } = await openMenu(makeUser());

        await user.click(screen.getByRole('menuitem', { name: 'Odjava' }));

        expect(lastVisit()).toMatchObject({ method: 'post', url: route('logout') });
    });
});
