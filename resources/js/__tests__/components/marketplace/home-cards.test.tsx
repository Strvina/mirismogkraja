import { renderOnPage } from '@/__tests__/support/render';
import { HomeProducerCard, HomeProductCard, type HomeProducer, type HomeProduct } from '@/components/marketplace/home-cards';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const producer = (overrides: Partial<HomeProducer> = {}): HomeProducer => ({
    id: 4,
    name: 'Mlekara Zapis',
    slug: 'mlekara-zapis',
    city: 'Niš',
    description: 'Sir i kajmak sa Svrljiških planina.',
    cover_image_path: null,
    logo_path: null,
    products_count: 3,
    reviews_count: 12,
    rating: 4.5,
    tags: ['Mlečni proizvodi', 'Sir'],
    is_premium: false,
    ...overrides,
});

const product = (overrides: Partial<HomeProduct> = {}): HomeProduct => ({
    id: 9,
    name: 'Domaći ajvar',
    slug: 'domaci-ajvar',
    price: '650.00',
    unit: 'kom',
    image: null,
    producer: { name: 'Mlekara Zapis', slug: 'mlekara-zapis', city: 'Niš' },
    ...overrides,
});

describe('HomeProducerCard', () => {
    const card = () => screen.getByRole('article');

    it("leads to the producer's page from the photo and from the name", () => {
        renderOnPage(<HomeProducerCard producer={producer()} />);

        const links = screen.getAllByRole('link', { name: 'Mlekara Zapis' });

        expect(links).toHaveLength(2);
        links.forEach((link) => expect(link).toHaveAttribute('href', route('marketplace.producers.show', 'mlekara-zapis')));
    });

    it('says a paid placement is one', () => {
        renderOnPage(<HomeProducerCard producer={producer()} featured />);

        expect(screen.getByRole('link', { name: 'Mlekara Zapis — Istaknuto' })).toBeInTheDocument();
        expect(screen.getByText('Istaknuto')).toBeVisible();
    });

    it('shows the rating and the number of impressions, or says there are none yet', () => {
        const { unmount } = renderOnPage(<HomeProducerCard producer={producer({ rating: 4.5, reviews_count: 12 })} />);
        expect(card()).toHaveTextContent('4.5(12)');
        unmount();

        renderOnPage(<HomeProducerCard producer={producer({ rating: null, reviews_count: 0 })} />);
        expect(screen.getByText('Još nema utisaka')).toBeVisible();
    });

    it.each([
        [1, '1 proizvod'],
        [3, '3 proizvoda'],
        [0, '0 proizvoda'],
    ])('counts %i products as "%s"', (products_count, text) => {
        renderOnPage(<HomeProducerCard producer={producer({ products_count })} />);

        expect(screen.getByText(text)).toBeVisible();
    });

    it('carries the town, the description, what they make and the Premium mark', () => {
        renderOnPage(<HomeProducerCard producer={producer({ is_premium: true })} />);

        expect(screen.getByText('Niš')).toBeVisible();
        expect(screen.getByText('Sir i kajmak sa Svrljiških planina.')).toBeVisible();
        expect(screen.getByText('Mlečni proizvodi')).toBeVisible();
        expect(screen.getByText('Sir')).toBeVisible();
        expect(screen.getByText('Premium')).toBeVisible();
    });

    it('leaves out what a new producer has not filled in', () => {
        renderOnPage(<HomeProducerCard producer={producer({ city: null, description: null, tags: [], is_premium: false })} />);

        expect(screen.queryByText('Niš')).not.toBeInTheDocument();
        expect(screen.queryByText('Premium')).not.toBeInTheDocument();
        expect(card()).not.toHaveTextContent('Sir');
    });

    it('shows the cover and the logo, or an initial in place of the logo', () => {
        const { unmount } = renderOnPage(
            <HomeProducerCard producer={producer({ cover_image_path: 'covers/zapis.jpg', logo_path: 'logos/zapis.jpg' })} />,
        );
        expect(card().querySelector('img[src="/storage/covers/zapis.jpg"]')).toBeInTheDocument();
        expect(card().querySelector('img[src="/storage/logos/zapis.jpg"]')).toBeInTheDocument();
        unmount();

        renderOnPage(<HomeProducerCard producer={producer({ name: 'mlekara Zapis' })} />);
        expect(card().querySelector('img')).toBeNull();
        expect(screen.getByText('M')).toBeVisible();
    });
});

describe('HomeProductCard', () => {
    const card = () => screen.getByRole('link');

    it('leads to the product, with its name, maker and price per unit', () => {
        renderOnPage(<HomeProductCard product={product({ price: '1250.00', unit: 'kg' })} />);

        expect(card()).toHaveAttribute('href', route('marketplace.products.show', 'domaci-ajvar'));
        expect(screen.getByRole('heading', { name: 'Domaći ajvar' })).toBeVisible();
        expect(screen.getByText('Mlekara Zapis')).toBeVisible();
        expect(card()).toHaveTextContent('1.250 RSD/ kg');
    });

    it('shows the photo, described by the name of the product', () => {
        renderOnPage(<HomeProductCard product={product({ image: 'products/ajvar.jpg' })} />);

        expect(screen.getByRole('img', { name: 'Domaći ajvar' })).toHaveAttribute('src', '/storage/products/ajvar.jpg');
    });

    it('does without a photo and without a town', () => {
        renderOnPage(<HomeProductCard product={product({ image: null, producer: { name: 'Mlekara Zapis', slug: 'mlekara-zapis', city: null } })} />);

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(screen.queryByText('Niš')).not.toBeInTheDocument();
    });
});
