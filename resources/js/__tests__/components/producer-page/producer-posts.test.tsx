import { renderOnPage } from '@/__tests__/support/render';
import ProducerPosts from '@/components/producer-page/producer-posts';
import { type PostSummary } from '@/types';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const post = (id: number, title: string): PostSummary => ({
    id,
    producer_id: 7,
    type: 'story',
    title,
    slug: `prica-${id}`,
    excerpt: null,
    cover_image_path: null,
    published_at: '2026-10-12T08:00:00Z',
});

describe('ProducerPosts', () => {
    it('is not on the page of a producer who has written nothing', () => {
        const { container } = renderOnPage(<ProducerPosts posts={[]} producerSlug="mlekara-zapis" />);

        expect(container).toBeEmptyDOMElement();
    });

    it('shows the latest stories and recipes', () => {
        renderOnPage(<ProducerPosts posts={[post(1, 'Kako se peče ajvar'), post(2, 'Sir iz mešine')]} producerSlug="mlekara-zapis" />);

        expect(screen.getByRole('heading', { name: 'Priče i recepti' })).toBeVisible();
        expect(screen.getByRole('heading', { name: 'Kako se peče ajvar' })).toBeVisible();
        expect(screen.getByRole('heading', { name: 'Sir iz mešine' })).toBeVisible();
    });

    it('links to the rest of them, filtered to this producer', () => {
        renderOnPage(<ProducerPosts posts={[post(1, 'Kako se peče ajvar')]} producerSlug="mlekara-zapis" />);

        expect(screen.getByRole('link', { name: 'Sve priče ovog proizvođača' })).toHaveAttribute(
            'href',
            route('marketplace.posts.index', { proizvodjac: 'mlekara-zapis' }),
        );
    });
});
