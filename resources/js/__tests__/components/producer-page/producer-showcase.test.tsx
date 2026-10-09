import { makeProduct } from '@/__tests__/support/factories';
import { renderOnPage } from '@/__tests__/support/render';
import { ProducerGallery, ProducerProducts } from '@/components/producer-page/producer-showcase';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('ProducerGallery', () => {
    it('is not on the page of a producer with no photos', () => {
        const { container } = renderOnPage(<ProducerGallery images={[]} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('shows each photo with its caption, which also describes it', () => {
        renderOnPage(<ProducerGallery images={[{ id: 1, path: 'gallery/stado.jpg', caption: 'Stado na Svrljiškim planinama' }]} />);

        expect(screen.getByRole('heading', { name: 'Galerija' })).toBeVisible();
        expect(screen.getByRole('img', { name: 'Stado na Svrljiškim planinama' })).toHaveAttribute('src', '/storage/gallery/stado.jpg');
        expect(screen.getByRole('figure')).toHaveTextContent('Stado na Svrljiškim planinama');
    });

    it('shows a photo without a caption as decoration, with no empty caption under it', () => {
        renderOnPage(<ProducerGallery images={[{ id: 1, path: 'gallery/stado.jpg', caption: null }]} />);

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(screen.getByRole('figure').querySelector('img')).toHaveAttribute('alt', '');
        expect(screen.getByRole('figure').querySelector('figcaption')).toBeNull();
    });
});

describe('ProducerProducts', () => {
    const products = [
        makeProduct({
            id: 1,
            name: 'Domaći ajvar',
            slug: 'domaci-ajvar',
            price: '650.00',
            images: [{ id: 1, path: 'products/ajvar.jpg', order: 0 }],
        }),
        makeProduct({ id: 2, name: 'Bagremov med', slug: 'bagremov-med', price: '1250.00', images: [] }),
    ];

    const renderProducts = (shown = products, total = shown.length) =>
        renderOnPage(<ProducerProducts producerId={7} producerSlug="mlekara-zapis" products={shown} total={total} />);

    it('says so when the producer has published nothing yet, and links nowhere', () => {
        renderProducts([]);

        expect(screen.getByText('Ovaj proizvođač još nema objavljene proizvode.')).toBeVisible();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('shows the newest products with their prices, each a link to its page', () => {
        renderProducts();

        const ajvar = screen.getByRole('link', { name: /Domaći ajvar/ });
        const med = screen.getByRole('link', { name: /Bagremov med/ });

        expect(ajvar).toHaveAttribute('href', route('marketplace.products.show', 'domaci-ajvar'));
        expect(ajvar).toHaveTextContent('650 RSD');
        expect(med).toHaveTextContent('1.250 RSD');
        expect(screen.getByRole('img', { name: 'Domaći ajvar' })).toHaveAttribute('src', '/storage/products/ajvar.jpg');
        expect(med.querySelector('img')).toBeNull();
    });

    it("links to the producer's price list once there is something on it", () => {
        renderProducts();

        expect(screen.getByRole('link', { name: 'Ponuda i cene na jednom mestu' })).toHaveAttribute(
            'href',
            route('marketplace.catalog', 'mlekara-zapis'),
        );
    });

    it('links to all of them in the catalogue when there are more than are shown', () => {
        renderProducts(products, 14);

        expect(screen.getByRole('link', { name: 'Svi proizvodi (14)' })).toHaveAttribute(
            'href',
            route('marketplace.products.index', { producer_id: 7 }),
        );
    });

    it('has no such link when every product is already on the page', () => {
        renderProducts(products, 2);

        expect(screen.queryByRole('link', { name: /^Svi proizvodi/ })).not.toBeInTheDocument();
    });
});
