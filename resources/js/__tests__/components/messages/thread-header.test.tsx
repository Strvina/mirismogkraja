import { lastVisit, visits } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import ConfirmHost from '@/components/confirm-host';
import ThreadHeader from '@/components/messages/thread-header';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const REASONS = { spam: 'Neželjene poruke', other: 'Nešto drugo' };

interface Options {
    isOwner?: boolean;
    blocked?: boolean;
    blockedByMe?: boolean;
    avatar?: string | null;
    title?: string;
}

function renderHeader({ isOwner = false, blocked = false, blockedByMe = false, avatar = null, title = 'Mlekara Zapis' }: Options = {}) {
    return renderOnPage(
        <>
            <ThreadHeader
                title={title}
                avatar={avatar}
                producer={{ id: 7, slug: 'mlekara-zapis' }}
                buyerId={22}
                isOwner={isOwner}
                blocked={blocked}
                blockedByMe={blockedByMe}
                reportReasons={REASONS}
            />
            <ConfirmHost />
        </>,
    );
}

describe('ThreadHeader', () => {
    it('names who the conversation is with', () => {
        renderHeader({ title: 'Mlekara Zapis' });

        expect(screen.getByRole('heading', { name: 'Mlekara Zapis' })).toBeVisible();
    });

    it('shows their picture, or their initial where there is none', () => {
        const { unmount } = renderHeader({ avatar: 'logos/zapis.jpg' });
        expect(screen.getByRole('banner').querySelector('img')).toHaveAttribute('src', '/storage/logos/zapis.jpg');
        unmount();

        renderHeader({ title: 'mlekara Zapis' });
        expect(screen.getByRole('banner').querySelector('img')).toBeNull();
        expect(screen.getByText('M')).toBeVisible();
    });

    it("gives a buyer the way to the producer's page", () => {
        renderHeader({ isOwner: false });

        expect(screen.getByRole('link', { name: 'Otvori profil proizvođača' })).toHaveAttribute(
            'href',
            route('marketplace.producers.show', 'mlekara-zapis'),
        );
    });

    it('gives a producer no such link: the other side is a buyer, who has no page', () => {
        renderHeader({ isOwner: true, title: 'Petar Petrović' });

        expect(screen.queryByRole('link', { name: 'Otvori profil proizvođača' })).not.toBeInTheDocument();
    });

    describe('blocking', () => {
        it('asks first, naming the other side and saying what a block does', async () => {
            const { user } = renderHeader({ title: 'Petar Petrović', isOwner: true });

            await user.click(screen.getByRole('button', { name: 'Blokiraj' }));

            const dialog = screen.getByRole('dialog');

            expect(dialog).toHaveAccessibleName('Blokirati razgovor sa korisnikom Petar Petrović?');
            expect(dialog).toHaveAccessibleDescription('Nijedno od vas neće moći da šalje poruke dok ga ne odblokirate. Prepiska ostaje sačuvana.');
            expect(visits()).toHaveLength(0);
        });

        it('blocks after a yes', async () => {
            const { user } = renderHeader();

            await user.click(screen.getByRole('button', { name: 'Blokiraj' }));
            await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Blokiraj' }));

            expect(lastVisit()).toMatchObject({
                method: 'patch',
                url: route('messages.block', [7, 22]),
                options: { preserveScroll: true },
            });
        });

        it('does nothing after a no', async () => {
            const { user } = renderHeader();

            await user.click(screen.getByRole('button', { name: 'Blokiraj' }));
            await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Odustani' }));

            expect(visits()).toHaveLength(0);
        });

        it('lets the side that blocked it open it again, with no question asked', async () => {
            const { user } = renderHeader({ blocked: true, blockedByMe: true });

            await user.click(screen.getByRole('button', { name: 'Odblokiraj' }));

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(lastVisit()).toMatchObject({ method: 'patch', url: route('messages.block', [7, 22]) });
        });

        it('offers neither to the side that was blocked: only the one who closed it can open it', () => {
            renderHeader({ blocked: true, blockedByMe: false });

            expect(screen.queryByRole('button', { name: 'Odblokiraj' })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Blokiraj' })).not.toBeInTheDocument();
        });
    });

    describe('reporting', () => {
        it('lets a buyer report the producer', async () => {
            const { user } = renderHeader({ isOwner: false });

            await user.click(screen.getByRole('button', { name: 'Prijavi problem' }));
            await user.click(screen.getByRole('button', { name: 'Pošalji prijavu' }));

            expect(lastVisit()).toMatchObject({ url: route('reports.store'), data: { reportable_type: 'producer', reportable_id: 7 } });
        });

        it('lets a producer report the buyer', async () => {
            const { user } = renderHeader({ isOwner: true });

            await user.click(screen.getByRole('button', { name: 'Prijavi problem' }));
            await user.click(screen.getByRole('button', { name: 'Pošalji prijavu' }));

            expect(lastVisit()).toMatchObject({ url: route('reports.store'), data: { reportable_type: 'user', reportable_id: 22 } });
        });

        it('stays possible in a blocked conversation', () => {
            renderHeader({ blocked: true, blockedByMe: false });

            expect(screen.getByRole('button', { name: 'Prijavi problem' })).toBeInTheDocument();
        });
    });
});
