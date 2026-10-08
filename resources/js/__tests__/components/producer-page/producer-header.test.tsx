import { makePublicProducer } from '@/__tests__/support/factories';
import { lastVisit } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import ProducerHeader from '@/components/producer-page/producer-header';
import { screen } from '@testing-library/react';
import { type ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';

type Props = ComponentProps<typeof ProducerHeader>;

function renderHeader(overrides: Partial<Props> = {}) {
    const props: Props = {
        producer: makePublicProducer({ id: 7, name: 'Mlekara Zapis', slug: 'mlekara-zapis', city: 'Svrljig' }),
        isPremium: false,
        responseTime: null,
        averageRating: 0,
        reviewCount: 0,
        followersCount: 0,
        isFollowing: false,
        canFollow: false,
        canMessage: false,
        canFavorite: false,
        isFavorited: false,
        canReport: false,
        reportReasons: { other: 'Nešto drugo' },
        place: null,
        ...overrides,
    };

    return renderOnPage(<ProducerHeader {...props} />);
}

const heading = () => screen.getByRole('heading', { level: 1 });

describe('ProducerHeader', () => {
    it('is, for a new producer and a guest, a name and a town and nothing to press', () => {
        const { container } = renderHeader();

        expect(heading()).toHaveTextContent(/^Mlekara Zapis$/);
        expect(screen.getByText('Svrljig')).toBeVisible();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(container.querySelector('img')).toBeNull();
    });

    it('shows the logo of a producer who has one', () => {
        const { container } = renderHeader({ producer: makePublicProducer({ logo_path: 'logos/zapis.jpg' }) });

        expect(container.querySelector('img')).toHaveAttribute('src', '/storage/logos/zapis.jpg');
    });

    describe('the marks a producer has earned', () => {
        const hint = () => screen.queryByRole('button', { name: 'Šta znače oznake?' });

        it('are none by default, so there is nothing to explain', () => {
            renderHeader();

            expect(heading()).not.toHaveTextContent('Provereno');
            expect(heading()).not.toHaveTextContent('Premium');
            expect(screen.queryByText(/Osnivač/)).not.toBeInTheDocument();
            expect(hint()).not.toBeInTheDocument();
        });

        it('include "Provereno" once an admin checked who they are', () => {
            renderHeader({ producer: makePublicProducer({ verified_at: '2026-05-01T10:00:00Z' }) });

            expect(heading()).toHaveTextContent('Provereno');
            expect(hint()).toBeInTheDocument();
        });

        it('include "Premium" for a paid membership', () => {
            renderHeader({ isPremium: true });

            expect(heading()).toHaveTextContent('Premium');
            expect(hint()).toBeInTheDocument();
        });

        it("include the founder's number, two digits wide, linking to the list of founders", () => {
            renderHeader({ producer: makePublicProducer({ founding_number: 7 }) });

            expect(screen.getByRole('link', { name: 'Osnivač #07' })).toHaveAttribute('href', route('marketplace.founding'));
            expect(hint()).toBeInTheDocument();
        });

        it('keep a two-digit number as it is', () => {
            renderHeader({ producer: makePublicProducer({ founding_number: 42 }) });

            expect(screen.getByRole('link', { name: 'Osnivač #42' })).toBeInTheDocument();
        });

        it('are explained one by one, and only the ones this producer has', async () => {
            const { user } = renderHeader({ producer: makePublicProducer({ verified_at: '2026-05-01T10:00:00Z', founding_number: 7 }) });

            await user.click(screen.getByRole('button', { name: 'Šta znače oznake?' }));

            const explanation = screen.getByRole('dialog');

            expect(explanation).toHaveTextContent('Provereno — proverili smo ko stoji iza ovog proizvođača.');
            expect(explanation).toHaveTextContent('Osnivač — jedan od prvih proizvođača na sajtu; broj označava redosled pridruživanja.');
            expect(explanation).not.toHaveTextContent('Premium');
        });
    });

    describe('the facts under the name', () => {
        it('link the town to its own page when it has one', () => {
            renderHeader({ place: { slug: 'svrljig', name: 'Svrljig' } });

            expect(screen.getByRole('link', { name: 'Svrljig' })).toHaveAttribute('href', route('marketplace.places.show', 'svrljig'));
        });

        it('leave the town out for a producer who gave none', () => {
            renderHeader({ producer: makePublicProducer({ city: null }) });

            expect(screen.queryByText('Svrljig')).not.toBeInTheDocument();
            expect(screen.queryByText('Niš')).not.toBeInTheDocument();
        });

        it('say how quickly they usually answer, once that is known', () => {
            renderHeader({ responseTime: 'hours' });

            expect(screen.getByText('Obično odgovara u roku od nekoliko sati')).toBeVisible();
        });

        it('show the rating with the number of impressions, and nothing while there are none', () => {
            const { container, unmount } = renderHeader({ averageRating: 4.7, reviewCount: 12 });
            expect(container).toHaveTextContent('4.7 (12)');
            unmount();

            const empty = renderHeader({ averageRating: 0, reviewCount: 0 });
            expect(empty.container).not.toHaveTextContent('(0)');
        });

        it.each([
            [1, '1 pratilac'],
            [2, '2 pratilaca'],
            [38, '38 pratilaca'],
        ])('count %i followers as "%s"', (followersCount, text) => {
            renderHeader({ followersCount });

            expect(screen.getByText(text)).toBeVisible();
        });

        it('say nothing about followers while there are none', () => {
            const { container } = renderHeader({ followersCount: 0 });

            expect(container).not.toHaveTextContent('pratila');
        });
    });

    describe('what a visitor can do', () => {
        it('lets a buyer follow, keeping the page where it is', async () => {
            const { user } = renderHeader({ canFollow: true, isFollowing: false });

            await user.click(screen.getByRole('button', { name: 'Zaprati' }));

            expect(lastVisit()).toMatchObject({ method: 'post', url: route('producers.follow', 7), options: { preserveScroll: true } });
        });

        it('shows that they already follow, and the same button stops it', async () => {
            const { user } = renderHeader({ canFollow: true, isFollowing: true });

            expect(screen.queryByRole('button', { name: 'Zaprati' })).not.toBeInTheDocument();

            await user.click(screen.getByRole('button', { name: 'Pratite' }));

            expect(lastVisit()).toMatchObject({ method: 'post', url: route('producers.follow', 7) });
        });

        it('leads to the conversation when writing is allowed', () => {
            renderHeader({ canMessage: true });

            expect(screen.getByRole('link', { name: 'Pošalji poruku' })).toHaveAttribute('href', route('messages.show', 'mlekara-zapis'));
        });

        it('offers no way to write while the producer takes no new inquiries', () => {
            renderHeader({ canMessage: false, canFollow: true });

            expect(screen.queryByRole('link', { name: 'Pošalji poruku' })).not.toBeInTheDocument();
        });

        it('lets someone signed in save the producer, and report them', () => {
            renderHeader({ canFavorite: true, isFavorited: false, canReport: true });

            expect(screen.getByRole('button', { name: 'Omiljeni proizvođač' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Prijavi problem' })).toBeInTheDocument();
        });

        it('shows a saved producer as saved', () => {
            renderHeader({ canFavorite: true, isFavorited: true });

            expect(screen.getByRole('button', { name: 'Omiljeno' })).toBeInTheDocument();
        });
    });
});
