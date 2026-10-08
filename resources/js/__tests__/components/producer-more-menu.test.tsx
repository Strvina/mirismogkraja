import { lastVisit, visits } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import ProducerMoreMenu from '@/components/producer-more-menu';
import { type Producer } from '@/types';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

async function openMenu(status: Producer['status']) {
    const view = renderOnPage(<ProducerMoreMenu producer={{ id: 7, status }} />);

    await view.user.click(screen.getByRole('button', { name: 'Više' }));

    return view;
}

const items = () => screen.getAllByRole('menuitem').map((item) => item.textContent);

describe('ProducerMoreMenu', () => {
    it('keeps everything behind one button', () => {
        renderOnPage(<ProducerMoreMenu producer={{ id: 7, status: 'active' }} />);

        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('lists what an approved producer manages besides the page and its products', async () => {
        await openMenu('active');

        expect(items()).toEqual([
            'Priče i recepti',
            'Gde me nađete',
            'Brzi odgovori',
            'Sertifikati',
            'QR poster za tezgu',
            'Pauza',
            'Preporuči proizvođača',
            'Isticanje',
            'Kampanje',
        ]);
    });

    it.each(['pending', 'blocked'] as const)(
        'offers no QR poster to a %s producer: its code would lead to a page that is not public',
        async (status) => {
            await openMenu(status);

            expect(screen.queryByRole('menuitem', { name: 'QR poster za tezgu' })).not.toBeInTheDocument();
            expect(items()).toHaveLength(8);
        },
    );

    it("leads to the producer's own pages", async () => {
        await openMenu('active');

        const link = (name: string) => screen.getByRole('menuitem', { name });

        expect(link('Priče i recepti')).toHaveAttribute('href', route('producers.posts.index', 7));
        expect(link('Gde me nađete')).toHaveAttribute('href', route('producers.markets.index', 7));
        expect(link('Brzi odgovori')).toHaveAttribute('href', route('producers.quick-replies.index', 7));
        expect(link('Sertifikati')).toHaveAttribute('href', route('producers.certificates.index', 7));
        expect(link('Pauza')).toHaveAttribute('href', route('producers.pause.edit', 7));
        expect(link('Preporuči proizvođača')).toHaveAttribute('href', route('producers.referrals.index', 7));
        expect(link('Isticanje')).toHaveAttribute('href', route('boosts.index'));
        expect(link('Kampanje')).toHaveAttribute('href', route('campaigns.index'));
    });

    it('opens a page as a visit inside the site', async () => {
        const { user } = await openMenu('active');

        await user.click(screen.getByRole('menuitem', { name: 'Pauza' }));

        expect(lastVisit()).toMatchObject({ method: 'get', url: route('producers.pause.edit', 7) });
    });

    it('hands the poster to the browser as a file to download, not as a page to visit', async () => {
        const { user } = await openMenu('active');
        const poster = screen.getByRole('menuitem', { name: 'QR poster za tezgu' });

        expect(poster).toHaveAttribute('href', route('producers.poster', 7));

        // The browser would follow the link; here it only must not become a visit.
        poster.addEventListener('click', (event) => event.preventDefault());
        await user.click(poster);

        expect(visits()).toHaveLength(0);
    });
});
