import { freezeDate } from '@/__tests__/support/render';
import { formatDate, formatNumber, formatPrice, formatRelativeTime, waitingBuyers } from '@/lib/format';
import { loadLocale } from '@/lib/i18n';
import { describe, expect, it } from 'vitest';

describe('formatPrice', () => {
    it('writes dinars the way Serbian groups thousands', () => {
        expect(formatPrice('1250.00')).toBe('1.250 RSD');
        expect(formatPrice(650)).toBe('650 RSD');
    });

    it('keeps the paras only when there are some', () => {
        expect(formatPrice('1250.50')).toBe('1.250,5 RSD');
        expect(formatPrice('99.99')).toBe('99,99 RSD');
    });

    it('follows the reader, not the producer: English and Russian group differently', async () => {
        await loadLocale('en');
        expect(formatPrice('1250.00')).toBe('1,250 RSD');

        await loadLocale('ru');
        expect(formatPrice('1250.00')).toMatch(/^1\s250 RSD$/);
    });
});

describe('formatNumber', () => {
    it('groups a whole number as each language does', async () => {
        expect(formatNumber(5990)).toBe('5.990');

        await loadLocale('en');
        expect(formatNumber(5990)).toBe('5,990');

        await loadLocale('ru');
        expect(formatNumber(5990)).toMatch(/^5\s990$/);
    });
});

describe('formatDate', () => {
    it('accepts a date string or a Date', () => {
        const options = { day: 'numeric', month: 'long', year: 'numeric' } as const;

        expect(formatDate('2026-10-12', options)).toBe('12. oktobar 2026.');
        expect(formatDate(new Date(2026, 9, 12), options)).toBe('12. oktobar 2026.');
    });

    it('names the month in the language of the page', async () => {
        await loadLocale('en');

        expect(formatDate('2026-10-12', { day: 'numeric', month: 'long' })).toBe('12 October');
    });
});

describe('waitingBuyers', () => {
    it.each([
        [1, 'Čeka 1 kupac'],
        [2, 'Čekaju 2 kupca'],
        [4, 'Čekaju 4 kupca'],
        [5, 'Čeka 5 kupaca'],
        [11, 'Čeka 11 kupaca'],
        [12, 'Čeka 12 kupaca'],
        [14, 'Čeka 14 kupaca'],
        [21, 'Čeka 21 kupac'],
        [22, 'Čekaju 22 kupca'],
        [25, 'Čeka 25 kupaca'],
        [100, 'Čeka 100 kupaca'],
        [111, 'Čeka 111 kupaca'],
        [101, 'Čeka 101 kupac'],
    ])('counts %i the Serbian way', (count, expected) => {
        expect(waitingBuyers(count)).toBe(expected);
    });

    it('tells only one from many in English', async () => {
        await loadLocale('en');

        const one = waitingBuyers(1);
        const two = waitingBuyers(2);
        const five = waitingBuyers(5);

        expect(one).toContain('1');
        expect(two).toContain('2');
        // Two and five take the same English form; one takes its own.
        expect(two.replace('2', '5')).toBe(five);
        expect(one.replace('1', '5')).not.toBe(five);
    });

    it('counts in Russian with the same three forms as Serbian', async () => {
        await loadLocale('ru');

        const forms = [1, 2, 5].map((count) => waitingBuyers(count).replace(String(count), ''));

        expect(new Set(forms).size).toBe(3);
        expect(waitingBuyers(21).replace('21', '')).toBe(forms[0]);
        expect(waitingBuyers(11).replace('11', '')).toBe(forms[2]);
    });
});

describe('formatRelativeTime', () => {
    const now = '2026-10-12T12:00:00Z';
    const ago = (seconds: number) => new Date(new Date(now).getTime() - seconds * 1000);

    it('says nothing for a missing or unreadable date', () => {
        expect(formatRelativeTime(null)).toBe('');
        expect(formatRelativeTime(undefined)).toBe('');
        expect(formatRelativeTime('')).toBe('');
        expect(formatRelativeTime('nije datum')).toBe('');
    });

    it('reads anything under a minute as just now', () => {
        freezeDate(now);

        expect(formatRelativeTime(ago(0))).toBe('upravo sada');
        expect(formatRelativeTime(ago(59))).toBe('upravo sada');
    });

    it('never speaks of the future when the clocks disagree', () => {
        freezeDate(now);

        expect(formatRelativeTime(ago(-3600))).toBe('upravo sada');
    });

    it.each([
        [60, 'pre 1 minut'],
        [2 * 60, 'pre 2 minuta'],
        [5 * 60, 'pre 5 minuta'],
        [59 * 60, 'pre 59 minuta'],
        [3600, 'pre 1 sat'],
        [3 * 3600, 'pre 3 sata'],
        [5 * 3600, 'pre 5 sati'],
        [21 * 3600, 'pre 21 sat'],
        [86400, 'pre 1 dan'],
        [2 * 86400, 'pre 2 dana'],
        [6 * 86400, 'pre 6 dana'],
        [7 * 86400, 'pre 1 nedelju'],
        [14 * 86400, 'pre 2 nedelje'],
        [30 * 86400, 'pre 1 mesec'],
        [90 * 86400, 'pre 3 meseca'],
        [150 * 86400, 'pre 5 meseci'],
        [365 * 86400, 'pre 1 godinu'],
        [2 * 365 * 86400, 'pre 2 godine'],
        [5 * 365 * 86400, 'pre 5 godina'],
    ])('spells %i seconds ago out in Serbian', (seconds, expected) => {
        freezeDate(now);

        expect(formatRelativeTime(ago(seconds))).toBe(expected);
    });

    it('accepts the ISO string the server sends', () => {
        freezeDate(now);

        expect(formatRelativeTime('2026-10-10T12:00:00Z')).toBe('pre 2 dana');
    });

    it('leaves English and Russian to the browser', async () => {
        freezeDate(now);

        await loadLocale('en');
        expect(formatRelativeTime(ago(2 * 86400))).toBe('2 days ago');
        expect(formatRelativeTime(ago(3600))).toBe('1 hour ago');

        await loadLocale('ru');
        expect(formatRelativeTime(ago(2 * 86400))).toBe('2 дня назад');
    });

    it('translates "just now" too', async () => {
        freezeDate(now);
        await loadLocale('en');

        expect(formatRelativeTime(ago(5))).not.toBe('upravo sada');
        expect(formatRelativeTime(ago(5))).not.toBe('');
    });
});
