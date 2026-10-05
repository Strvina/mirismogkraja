import { t, tx } from '@/lib/i18n';

/** ISO weekdays, Monday first - as stored in a market's `days`. */
export const WEEKDAYS = [
    { value: 1, short: tx('Pon'), long: tx('Ponedeljak') },
    { value: 2, short: tx('Uto'), long: tx('Utorak') },
    { value: 3, short: tx('Sre'), long: tx('Sreda') },
    { value: 4, short: tx('Čet'), long: tx('Četvrtak') },
    { value: 5, short: tx('Pet'), long: tx('Petak') },
    { value: 6, short: tx('Sub'), long: tx('Subota') },
    { value: 7, short: tx('Ned'), long: tx('Nedelja') },
] as const;

/** Today as an ISO weekday (JavaScript counts from Sunday = 0). */
export function todayWeekday(): number {
    return new Date().getDay() || 7;
}

/** "Sub, Ned", or "Svakog dana" for all seven. */
export function formatDays(days: number[]): string {
    if (days.length === 7) {
        return t('Svakog dana');
    }

    return WEEKDAYS.filter((day) => days.includes(day.value))
        .map((day) => t(day.short))
        .join(', ');
}
