import { freezeDate } from '@/__tests__/support/render';
import MarketList from '@/components/producer-page/market-list';
import { type ProducerMarket } from '@/types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const market = (overrides: Partial<ProducerMarket> = {}): ProducerMarket => ({
    id: 1,
    producer_id: 7,
    name: 'Tvrđava pijaca',
    city: 'Niš',
    days: [6, 7],
    opens_at: '07:00',
    closes_at: '13:00',
    note: 'Tezga broj 14, kod glavnog ulaza.',
    ...overrides,
});

const SATURDAY = '2026-10-17T09:00:00';
const TUESDAY = '2026-10-13T09:00:00';

describe('MarketList', () => {
    it('is not on the page of a producer who sells nowhere in person', () => {
        const { container } = render(<MarketList markets={[]} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('says where, on which days, at what hours, and how to find the stall', () => {
        freezeDate(TUESDAY);
        render(<MarketList markets={[market()]} />);

        expect(screen.getByRole('heading', { name: 'Gde me nađete' })).toBeVisible();
        expect(screen.getByRole('listitem')).toHaveTextContent('Tvrđava pijacaNišSub, Ned07:00–13:00Tezga broj 14, kod glavnog ulaza.');
    });

    it('marks a market the producer is at today', () => {
        freezeDate(SATURDAY);
        render(
            <MarketList markets={[market({ id: 1, name: 'Tvrđava pijaca', days: [6, 7] }), market({ id: 2, name: 'Zelena pijaca', days: [3] })]} />,
        );

        const [weekend, wednesday] = screen.getAllByRole('listitem');

        expect(weekend).toHaveTextContent('Danas');
        expect(wednesday).not.toHaveTextContent('Danas');
    });

    it('marks none on a day the producer is at no market', () => {
        freezeDate(TUESDAY);
        render(<MarketList markets={[market()]} />);

        expect(screen.queryByText('Danas')).not.toBeInTheDocument();
    });

    it('knows Sunday as the seventh day', () => {
        freezeDate('2026-10-18T09:00:00');
        render(<MarketList markets={[market({ days: [7] })]} />);

        expect(screen.getByText('Danas')).toBeVisible();
    });

    it('says "every day" for a stall that is always there', () => {
        freezeDate(TUESDAY);
        render(<MarketList markets={[market({ days: [1, 2, 3, 4, 5, 6, 7] })]} />);

        expect(screen.getByRole('listitem')).toHaveTextContent('Svakog dana');
        expect(screen.getByText('Danas')).toBeVisible();
    });

    it('leaves out the town, the hours and the note a market does not have', () => {
        freezeDate(TUESDAY);
        render(<MarketList markets={[market({ city: null, opens_at: null, closes_at: null, note: null })]} />);

        expect(screen.getByRole('listitem')).toHaveTextContent(/^Tvrđava pijacaSub, Ned$/);
    });

    it('shows no hours unless both ends are known', () => {
        freezeDate(TUESDAY);
        render(<MarketList markets={[market({ opens_at: '07:00', closes_at: null, city: null, note: null })]} />);

        expect(screen.getByRole('listitem')).not.toHaveTextContent('07:00');
    });
});
