import { lastVisit, setPage, visits } from '@/__tests__/support/inertia';
import { freezeDate, renderOnPage } from '@/__tests__/support/render';
import NotificationsBell from '@/components/marketplace/notifications-bell';
import { type SiteNotification } from '@/types';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const notification = (overrides: Partial<SiteNotification> = {}): SiteNotification => ({
    id: 'a1',
    title: 'Nova poruka od kupca',
    body: 'Petar pita za ajvar.',
    read: false,
    created_at: '2026-10-12T08:00:00Z',
    ...overrides,
});

const bell = () => screen.getByRole('button', { name: /^Obaveštenja/ });

describe('NotificationsBell', () => {
    it('is quiet when nothing is unread', () => {
        renderOnPage(<NotificationsBell />, { props: { unreadNotifications: 0 } });

        expect(screen.getByRole('button', { name: 'Obaveštenja' }).textContent).toBe('');
    });

    it('says how many are unread, to the eye and to a screen reader', () => {
        renderOnPage(<NotificationsBell />, { props: { unreadNotifications: 4 } });

        expect(screen.getByRole('button', { name: 'Obaveštenja (4 nepročitanih)' })).toHaveTextContent('4');
    });

    it('stops counting at 99 on the badge', () => {
        renderOnPage(<NotificationsBell />, { props: { unreadNotifications: 120 } });

        expect(screen.getByRole('button', { name: 'Obaveštenja (120 nepročitanih)' })).toHaveTextContent('99+');
    });

    it('asks for nothing until the bell is opened', () => {
        renderOnPage(<NotificationsBell />, { props: { unreadNotifications: 4 } });

        expect(visits()).toHaveLength(0);
    });

    it('fetches the list in one small request when opened, and says it is loading', async () => {
        const { user } = renderOnPage(<NotificationsBell />, { props: { unreadNotifications: 4 } });

        await user.click(bell());

        expect(visits()).toHaveLength(1);
        expect(lastVisit()).toMatchObject({ reload: true, options: { only: ['recentNotifications'] } });
        expect(screen.getByText('Učitavanje…')).toBeVisible();
    });

    it('lists what arrived: title, text, how long ago, and where it leads', async () => {
        freezeDate('2026-10-12T10:00:00Z');
        const { user } = renderOnPage(<NotificationsBell />, { props: { unreadNotifications: 1 } });

        await user.click(bell());
        lastVisit().succeed({ recentNotifications: [notification()] });

        const item = screen.getByRole('menuitem', { name: /Nova poruka od kupca/ });

        expect(item).toHaveTextContent('Petar pita za ajvar.');
        expect(item).toHaveTextContent('pre 2 sata');
        expect(item).toHaveAttribute('href', route('notifications.open', 'a1'));
        expect(screen.queryByText('Učitavanje…')).not.toBeInTheDocument();
    });

    it('lists a notification that has no text by its title alone', async () => {
        const { user } = renderOnPage(<NotificationsBell />, { props: { unreadNotifications: 1 } });

        await user.click(bell());
        lastVisit().succeed({ recentNotifications: [notification({ body: null, title: 'Profil je odobren' })] });

        expect(screen.getByRole('menuitem', { name: /Profil je odobren/ })).not.toHaveTextContent('Petar');
    });

    it('says so when there are none', async () => {
        const { user } = renderOnPage(<NotificationsBell />);

        await user.click(bell());
        lastVisit().succeed({ recentNotifications: [] });

        expect(screen.getByText('Nemate obaveštenja.')).toBeVisible();
    });

    it('always offers the way to all of them', async () => {
        const { user } = renderOnPage(<NotificationsBell />);

        await user.click(bell());

        expect(screen.getByRole('menuitem', { name: 'Sva obaveštenja' })).toHaveAttribute('href', route('notifications.index'));
    });

    it('does not fetch again on a later opening if nothing new has arrived', async () => {
        const { user } = renderOnPage(<NotificationsBell />, { props: { unreadNotifications: 1 } });

        await user.click(bell());
        lastVisit().succeed({ recentNotifications: [notification()] });
        await user.keyboard('{Escape}');
        await user.click(bell());

        expect(visits()).toHaveLength(1);
        expect(screen.getByRole('menuitem', { name: /Nova poruka od kupca/ })).toBeInTheDocument();
    });

    it('fetches again when the unread count has moved since, so the new one is in the list', async () => {
        const { user } = renderOnPage(<NotificationsBell />, { props: { unreadNotifications: 1 } });

        await user.click(bell());
        lastVisit().succeed({ recentNotifications: [notification()] });
        await user.keyboard('{Escape}');

        // The header's poll brings a higher count while the bell is closed.
        setPage({ props: { unreadNotifications: 2 } });
        await user.click(bell());

        expect(visits()).toHaveLength(2);
        expect(lastVisit()).toMatchObject({ reload: true, options: { only: ['recentNotifications'] } });
    });

    it('does not fetch when the menu is being closed', async () => {
        const { user } = renderOnPage(<NotificationsBell />, { props: { unreadNotifications: 1 } });

        await user.click(bell());
        setPage({ props: { unreadNotifications: 5 } });
        await user.keyboard('{Escape}');

        expect(visits()).toHaveLength(1);
    });
});
