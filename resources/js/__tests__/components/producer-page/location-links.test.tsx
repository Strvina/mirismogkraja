import { makePublicProducer } from '@/__tests__/support/factories';
import { createUser } from '@/__tests__/support/render';
import LocationLinks from '@/components/producer-page/location-links';
import { type PublicProducer } from '@/components/producer-page/types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Leaflet is loaded only when the map is asked for; here the map is a
// placeholder that says which points it was given.
vi.mock('@/components/marketplace/map', () => ({
    PointsMap: ({ points }: { points: { name: string; lat: number; lng: number }[] }) => (
        <div role="img" aria-label={`Mapa: ${points.map((point) => `${point.name} @ ${point.lat},${point.lng}`).join('; ')}`} />
    ),
}));

const producer = (overrides: Partial<PublicProducer> = {}) =>
    makePublicProducer({ name: 'Mlekara Zapis', lat: '43.4100000', lng: '22.0100000', ...overrides });

describe('LocationLinks', () => {
    it.each([
        ['no point at all', { lat: null, lng: null }],
        ['only a latitude', { lat: '43.41', lng: null }],
        ['only a longitude', { lat: null, lng: '22.01' }],
    ])('is not there for a producer who marked %s', (_case, coordinates) => {
        const { container } = render(<LocationLinks producer={producer(coordinates)} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('keeps the map folded away until the visitor asks for it', () => {
        render(<LocationLinks producer={producer()} />);

        expect(screen.getByRole('button', { name: 'Prikaži na mapi' })).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('opens the map on the producer, and folds it away again', async () => {
        const user = createUser();
        render(<LocationLinks producer={producer()} />);

        await user.click(screen.getByRole('button', { name: 'Prikaži na mapi' }));

        expect(screen.getByRole('img', { name: 'Mapa: Mlekara Zapis @ 43.41,22.01' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sakrij mapu' })).toHaveAttribute('aria-expanded', 'true');

        await user.click(screen.getByRole('button', { name: 'Sakrij mapu' }));

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('sends directions to Google Maps, in a new tab', () => {
        render(<LocationLinks producer={producer()} />);

        const link = screen.getByRole('link', { name: 'Otvori u Google mapama' });

        expect(link).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=43.41,22.01');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
});
