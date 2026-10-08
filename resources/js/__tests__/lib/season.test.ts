import { freezeDate } from '@/__tests__/support/render';
import { loadLocale } from '@/lib/i18n';
import { hasSeason, isInSeason, monthName, seasonLabel } from '@/lib/season';
import { describe, expect, it } from 'vitest';

describe('hasSeason', () => {
    it('needs both ends of the range', () => {
        expect(hasSeason({ season_from: 6, season_to: 9 })).toBe(true);
        expect(hasSeason({ season_from: 6, season_to: null })).toBe(false);
        expect(hasSeason({ season_from: null, season_to: 9 })).toBe(false);
        expect(hasSeason({})).toBe(false);
    });
});

describe('isInSeason', () => {
    it('is always in season when no season is set', () => {
        expect(isInSeason({}, 1)).toBe(true);
        expect(isInSeason({ season_from: null, season_to: null }, 7)).toBe(true);
    });

    it('includes both the first and the last month of the range', () => {
        const summer = { season_from: 6, season_to: 9 };

        expect(isInSeason(summer, 5)).toBe(false);
        expect(isInSeason(summer, 6)).toBe(true);
        expect(isInSeason(summer, 8)).toBe(true);
        expect(isInSeason(summer, 9)).toBe(true);
        expect(isInSeason(summer, 10)).toBe(false);
    });

    it('follows a range that wraps the new year', () => {
        const winter = { season_from: 11, season_to: 2 };

        expect(isInSeason(winter, 10)).toBe(false);
        expect(isInSeason(winter, 11)).toBe(true);
        expect(isInSeason(winter, 12)).toBe(true);
        expect(isInSeason(winter, 1)).toBe(true);
        expect(isInSeason(winter, 2)).toBe(true);
        expect(isInSeason(winter, 3)).toBe(false);
    });

    it('takes a single month as a season of one month', () => {
        expect(isInSeason({ season_from: 5, season_to: 5 }, 5)).toBe(true);
        expect(isInSeason({ season_from: 5, season_to: 5 }, 6)).toBe(false);
    });

    it('asks about this month when none is given', () => {
        freezeDate('2026-07-15T10:00:00');
        expect(isInSeason({ season_from: 6, season_to: 9 })).toBe(true);

        freezeDate('2026-12-15T10:00:00');
        expect(isInSeason({ season_from: 6, season_to: 9 })).toBe(false);
    });
});

describe('monthName', () => {
    it('names a month short by default and long on request', () => {
        expect(monthName(7)).toBe('jul');
        expect(monthName(10, 'long')).toBe('oktobar');
    });

    it('names it in the language of the page', async () => {
        await loadLocale('en');

        expect(monthName(7)).toBe('Jul');
        expect(monthName(10, 'long')).toBe('October');
    });
});

describe('seasonLabel', () => {
    it('joins the two months', () => {
        expect(seasonLabel({ season_from: 7, season_to: 9 })).toBe('jul – sep');
    });

    it('is nothing for a product available all year', () => {
        expect(seasonLabel({})).toBeNull();
        expect(seasonLabel({ season_from: 7, season_to: null })).toBeNull();
    });
});
