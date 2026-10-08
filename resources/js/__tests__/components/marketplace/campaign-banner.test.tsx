import { freezeDate, renderOnPage } from '@/__tests__/support/render';
import { CampaignCard, CampaignHero, type CampaignSummary } from '@/components/marketplace/campaign-banner';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const campaign = (overrides: Partial<CampaignSummary> = {}): CampaignSummary => ({
    id: 1,
    name: 'Jesen na jugu',
    slug: 'jesen-na-jugu',
    description: 'Ajvar, pekmez i sve što se sprema za zimu.',
    starts_on: '2026-10-05',
    ends_on: '2026-10-25',
    producers_count: 8,
    ...overrides,
});

describe('CampaignCard', () => {
    beforeEach(() => freezeDate('2026-10-12T10:00:00'));

    const card = () => screen.getByRole('link');

    it("leads to the campaign's page, with its name and what it is about", () => {
        renderOnPage(<CampaignCard campaign={campaign()} />);

        expect(card()).toHaveAttribute('href', route('campaigns.show', 'jesen-na-jugu'));
        expect(screen.getByRole('heading', { name: 'Jesen na jugu' })).toBeVisible();
        expect(screen.getByText('Ajvar, pekmez i sve što se sprema za zimu.')).toBeVisible();
    });

    it('says when it runs, in words', () => {
        renderOnPage(<CampaignCard campaign={campaign()} />);

        expect(card()).toHaveTextContent('Sezonska kampanja · 5. oktobar – 25. oktobar');
    });

    it.each([
        ['2026-10-25', 'Traje još 13 dana'],
        ['2026-10-14', 'Traje još 2 dana'],
        ['2026-10-13', 'Traje još 1 dan'],
        ['2026-10-12', 'Poslednji dan'],
    ])('counts down to %s as "%s"', (ends_on, text) => {
        renderOnPage(<CampaignCard campaign={campaign({ ends_on })} />);

        expect(screen.getByText(text)).toBeVisible();
    });

    it('never counts below the last day, should a finished campaign still be shown', () => {
        renderOnPage(<CampaignCard campaign={campaign({ ends_on: '2026-10-01' })} />);

        expect(screen.getByText('Poslednji dan')).toBeVisible();
    });

    it('says how many producers take part', () => {
        renderOnPage(<CampaignCard campaign={campaign({ producers_count: 8 })} />);

        expect(screen.getByText('Učestvuje proizvođača: 8')).toBeVisible();
    });

    it.each([[0], [undefined]])('says nothing about producers while there are none to count (%s)', (producers_count) => {
        renderOnPage(<CampaignCard campaign={campaign({ producers_count })} />);

        expect(card()).not.toHaveTextContent('Učestvuje proizvođača');
    });

    it('does without a description', () => {
        renderOnPage(<CampaignCard campaign={campaign({ description: null })} />);

        expect(card()).not.toHaveTextContent('Ajvar, pekmez');
    });
});

describe('CampaignHero', () => {
    beforeEach(() => freezeDate('2026-10-12T10:00:00'));

    it("titles the campaign's own page and counts down on it too", () => {
        renderOnPage(<CampaignHero campaign={campaign()} />);

        expect(screen.getByRole('heading', { level: 1, name: 'Jesen na jugu' })).toBeVisible();
        expect(screen.getByText('Traje još 13 dana')).toBeVisible();
        expect(screen.getByText('Učestvuje proizvođača: 8')).toBeVisible();
        expect(screen.getByText('Ajvar, pekmez i sve što se sprema za zimu.')).toBeVisible();
    });

    it('leaves out the producers and the description it does not have', () => {
        const { container } = renderOnPage(<CampaignHero campaign={campaign({ producers_count: 0, description: null })} />);

        expect(container).not.toHaveTextContent('Učestvuje proizvođača');
        expect(container).not.toHaveTextContent('Ajvar, pekmez');
    });
});
