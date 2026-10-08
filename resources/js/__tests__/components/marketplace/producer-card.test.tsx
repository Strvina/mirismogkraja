import { makeProducerCard } from '@/__tests__/support/factories';
import { renderOnPage } from '@/__tests__/support/render';
import ProducerCard from '@/components/marketplace/producer-card';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const review = (id: number, name: string, overrides: object = {}) => ({
    id,
    rating: 5,
    comment: 'Sve preporuke.',
    image_path: null,
    user: { id, name, avatar_path: null },
    ...overrides,
});

const card = () => screen.getByRole('article');

describe('ProducerCard', () => {
    it("leads to the producer's page from the photo and from the name", () => {
        renderOnPage(<ProducerCard producer={makeProducerCard({ name: 'Mlekara Zapis', slug: 'mlekara-zapis' })} />);

        const links = screen.getAllByRole('link', { name: 'Mlekara Zapis' });

        expect(links).toHaveLength(2);
        links.forEach((link) => expect(link).toHaveAttribute('href', route('marketplace.producers.show', 'mlekara-zapis')));
    });

    it('says a paid placement is one, to the eye and to a screen reader', () => {
        renderOnPage(<ProducerCard producer={makeProducerCard({ name: 'Mlekara Zapis' })} featured />);

        expect(screen.getByRole('link', { name: 'Mlekara Zapis — Istaknuto' })).toBeInTheDocument();
        expect(screen.getByText('Istaknuto')).toBeVisible();
    });

    it('carries no such mark in the ordinary list', () => {
        renderOnPage(<ProducerCard producer={makeProducerCard()} />);

        expect(screen.queryByText('Istaknuto')).not.toBeInTheDocument();
    });

    it('shows the rating to one decimal and how many it is the average of', () => {
        renderOnPage(<ProducerCard producer={makeProducerCard({ reviews_avg_rating: 4.5, reviews_count: 12 })} />);

        expect(card()).toHaveTextContent('4.5(12)');
        expect(screen.queryByText('Još nema utisaka')).not.toBeInTheDocument();
    });

    it('rounds a long average', () => {
        renderOnPage(<ProducerCard producer={makeProducerCard({ reviews_avg_rating: 4.6667, reviews_count: 3 })} />);

        expect(card()).toHaveTextContent('4.7(3)');
    });

    it('says there are no impressions yet rather than showing a zero', () => {
        renderOnPage(<ProducerCard producer={makeProducerCard({ reviews_avg_rating: null, reviews_count: 0 })} />);

        expect(screen.getByText('Još nema utisaka')).toBeVisible();
    });

    it('marks a producer whose identity was checked, and a Premium one', () => {
        renderOnPage(<ProducerCard producer={makeProducerCard({ verified_at: '2026-05-01T10:00:00Z', is_premium: true })} />);

        expect(screen.getByLabelText('Provereni proizvođač')).toBeInTheDocument();
        expect(screen.getByText('Premium')).toBeVisible();
    });

    it('carries neither mark by default', () => {
        renderOnPage(<ProducerCard producer={makeProducerCard()} />);

        expect(screen.queryByLabelText('Provereni proizvođač')).not.toBeInTheDocument();
        expect(screen.queryByText('Premium')).not.toBeInTheDocument();
    });

    it.each([
        [1, '1 proizvod'],
        [2, '2 proizvoda'],
        [0, '0 proizvoda'],
        [14, '14 proizvoda'],
    ])('counts %i products as "%s"', (count, text) => {
        renderOnPage(<ProducerCard producer={makeProducerCard({ products_count: count })} />);

        expect(screen.getByText(text)).toBeVisible();
    });

    it('shows the town, and the distance when the list is sorted by it', () => {
        renderOnPage(<ProducerCard producer={makeProducerCard({ city: 'Leskovac', distance_km: 12 })} />);

        expect(screen.getByText('Leskovac')).toBeVisible();
        expect(screen.getByText('12 km od vas')).toBeVisible();
    });

    it('shows a distance of zero, for the producer next door', () => {
        renderOnPage(<ProducerCard producer={makeProducerCard({ distance_km: 0 })} />);

        expect(screen.getByText('0 km od vas')).toBeVisible();
    });

    it('leaves out the town and the distance it does not know', () => {
        renderOnPage(<ProducerCard producer={makeProducerCard({ city: null, distance_km: null })} />);

        expect(card()).not.toHaveTextContent('km od vas');
        expect(screen.queryByText('Niš')).not.toBeInTheDocument();
    });

    it("lists how the goods travel, the usual ways in plain words and the producer's own as written", () => {
        renderOnPage(<ProducerCard producer={makeProducerCard({ delivery_methods: ['kurirska_sluzba', 'preuzimanje', 'Autobusom do Niša'] })} />);

        expect(screen.getByText('Kurirska služba · Lično preuzimanje · Autobusom do Niša')).toBeVisible();
    });

    it.each([[null], [[]]])('says nothing about delivery when none is set (%j)', (delivery_methods) => {
        renderOnPage(<ProducerCard producer={makeProducerCard({ delivery_methods })} />);

        expect(card()).not.toHaveTextContent('Kurirska služba');
        expect(card()).not.toHaveTextContent('·');
    });

    describe('reviews', () => {
        const reviews = [review(1, 'Jovana'), review(2, 'Petar', { rating: 4 }), review(3, 'Ana')];

        it('quotes one on a regular card, to keep the grid tight', () => {
            renderOnPage(<ProducerCard producer={makeProducerCard({ reviews })} />);

            expect(screen.getByText('Jovana')).toBeVisible();
            expect(screen.queryByText('Petar')).not.toBeInTheDocument();
        });

        it('quotes two on a featured card', () => {
            renderOnPage(<ProducerCard producer={makeProducerCard({ reviews })} featured />);

            expect(screen.getByText('Jovana')).toBeVisible();
            expect(screen.getByText('Petar')).toBeVisible();
            expect(screen.queryByText('Ana')).not.toBeInTheDocument();
        });

        it('reads the stars out as a grade', () => {
            renderOnPage(<ProducerCard producer={makeProducerCard({ reviews: [review(2, 'Petar', { rating: 4 })] })} />);

            expect(screen.getByLabelText('Ocena 4 od 5')).toHaveTextContent('★★★★');
        });

        it('shows a review that is only a grade, and one with a photo', () => {
            renderOnPage(
                <ProducerCard producer={makeProducerCard({ reviews: [review(1, 'Jovana', { comment: null, image_path: 'reviews/sir.jpg' })] })} />,
            );

            expect(screen.queryByText('Sve preporuke.')).not.toBeInTheDocument();
            expect(card().querySelector('img[src="/storage/reviews/sir.jpg"]')).toBeInTheDocument();
        });
    });
});
