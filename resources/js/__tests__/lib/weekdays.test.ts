import { freezeDate } from '@/__tests__/support/render';
import { loadLocale } from '@/lib/i18n';
import { formatDays, todayWeekday, WEEKDAYS } from '@/lib/weekdays';
import { describe, expect, it } from 'vitest';

describe('todayWeekday', () => {
    it.each([
        ['2026-10-12T10:00:00', 1],
        ['2026-10-14T10:00:00', 3],
        ['2026-10-17T10:00:00', 6],
    ])('counts %s from Monday = 1', (date, weekday) => {
        freezeDate(date);

        expect(todayWeekday()).toBe(weekday);
    });

    it('makes Sunday the seventh day, not day zero', () => {
        freezeDate('2026-10-18T10:00:00');

        expect(todayWeekday()).toBe(7);
    });
});

describe('formatDays', () => {
    it('lists the days by their short names', () => {
        expect(formatDays([6, 7])).toBe('Sub, Ned');
    });

    it('lists them in week order, whatever order they were saved in', () => {
        expect(formatDays([5, 1, 3])).toBe('Pon, Sre, Pet');
    });

    it('says "every day" for all seven', () => {
        expect(formatDays([1, 2, 3, 4, 5, 6, 7])).toBe('Svakog dana');
    });

    it('is empty for a market with no days', () => {
        expect(formatDays([])).toBe('');
    });

    it('ignores a number that is not a weekday', () => {
        expect(formatDays([0, 2, 9])).toBe('Uto');
    });

    it('translates the day names', async () => {
        await loadLocale('en');

        expect(formatDays([1])).not.toBe('Pon');
        expect(formatDays([1, 2, 3, 4, 5, 6, 7])).not.toBe('Svakog dana');
    });
});

describe('WEEKDAYS', () => {
    it('is the ISO week, Monday first', () => {
        expect(WEEKDAYS.map((day) => day.value)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(WEEKDAYS[0].long).toBe('Ponedeljak');
        expect(WEEKDAYS[6].long).toBe('Nedelja');
    });
});
