import { renderOnPage } from '@/__tests__/support/render';
import PostCard from '@/components/marketplace/post-card';
import { type PostSummary } from '@/types';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const post = (overrides: Partial<PostSummary> = {}): PostSummary => ({
    id: 3,
    producer_id: 1,
    type: 'story',
    title: 'Kako se peče ajvar',
    slug: 'kako-se-pece-ajvar',
    excerpt: 'Svake jeseni, kad paprika stigne…',
    cover_image_path: null,
    published_at: '2026-10-12T08:00:00Z',
    producer: { id: 1, name: 'Mlekara Zapis', slug: 'mlekara-zapis', city: 'Niš', logo_path: null },
    ...overrides,
});

const card = () => screen.getByRole('link');

describe('PostCard', () => {
    it('leads to the post, with its title and how it starts', () => {
        renderOnPage(<PostCard post={post()} />);

        expect(card()).toHaveAttribute('href', route('marketplace.posts.show', 'kako-se-pece-ajvar'));
        expect(screen.getByRole('heading', { name: 'Kako se peče ajvar' })).toBeVisible();
        expect(screen.getByText('Svake jeseni, kad paprika stigne…')).toBeVisible();
    });

    it.each([
        ['story', 'Priča'],
        ['recipe', 'Recept'],
    ] as const)('says a %s is a "%s"', (type, label) => {
        renderOnPage(<PostCard post={post({ type })} />);

        expect(screen.getByText(label)).toBeVisible();
    });

    it('signs it with who wrote it and when', () => {
        renderOnPage(<PostCard post={post()} />);

        expect(screen.getByText('Mlekara Zapis · 12. oktobar 2026.')).toBeVisible();
    });

    it('signs a draft, which has no date yet, with the producer alone', () => {
        renderOnPage(<PostCard post={post({ published_at: null })} />);

        expect(screen.getByText('Mlekara Zapis')).toBeVisible();
        expect(card()).not.toHaveTextContent('·');
    });

    it("signs a post on the producer's own page with the date alone", () => {
        renderOnPage(<PostCard post={post({ producer: undefined })} />);

        expect(screen.getByText('12. oktobar 2026.')).toBeVisible();
    });

    it('shows the cover when there is one', () => {
        renderOnPage(<PostCard post={post({ cover_image_path: 'posts/ajvar.jpg' })} />);

        expect(card().querySelector('img')).toHaveAttribute('src', '/storage/posts/ajvar.jpg');
    });

    it('does without a cover and without an opening', () => {
        renderOnPage(<PostCard post={post({ cover_image_path: null, excerpt: null })} />);

        expect(card().querySelector('img')).toBeNull();
        expect(screen.queryByText('Svake jeseni, kad paprika stigne…')).not.toBeInTheDocument();
    });
});
