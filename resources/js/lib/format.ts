import { currentLocale, intlLocale, t, tx } from '@/lib/i18n';

/**
 * Prices arrive from Eloquent as decimal strings ("1250.00"). Rendered the
 * way the reader's language writes numbers - "1.250 RSD" in Serbian,
 * "1,250 RSD" in English - always in dinars.
 */
export function formatPrice(value: string | number): string {
    return `${new Intl.NumberFormat(intlLocale(), { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value))} RSD`;
}

/** A whole number as the reader's language groups it: 5.990 / 5,990 / 5 990. */
export function formatNumber(value: number): string {
    return new Intl.NumberFormat(intlLocale()).format(value);
}

/** A date as the reader's language writes it; `options` as for toLocaleDateString. */
export function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
    return (value instanceof Date ? value : new Date(value)).toLocaleDateString(intlLocale(), options);
}

/**
 * Serbian plural forms: 1 dan / 2 dana / 5 dana. The rule is on the last
 * digit, with the teens (11-14) always taking the many-form.
 */
function plural(count: number, one: string, few: string, many: string): string {
    const lastTwo = count % 100;
    const last = count % 10;

    if (lastTwo >= 11 && lastTwo <= 14) {
        return many;
    }
    if (last === 1) {
        return one;
    }
    if (last >= 2 && last <= 4) {
        return few;
    }

    return many;
}

const WAITING_FORMS = [tx('Čeka :count kupac'), tx('Čekaju :count kupca'), tx('Čeka :count kupaca')] as const;

/**
 * "Čeka 1 kupac" / "Čekaju 3 kupca" / "Čeka 12 kupaca". Russian counts the
 * way Serbian does; English only tells one from many.
 */
export function waitingBuyers(count: number): string {
    const form = currentLocale() === 'en' ? (count === 1 ? WAITING_FORMS[0] : WAITING_FORMS[2]) : plural(count, ...WAITING_FORMS);

    return t(form, { count });
}

const RELATIVE_UNITS: { seconds: number; unit: Intl.RelativeTimeFormatUnit; forms: [string, string, string] }[] = [
    { seconds: 31536000, unit: 'year', forms: ['godinu', 'godine', 'godina'] },
    { seconds: 2592000, unit: 'month', forms: ['mesec', 'meseca', 'meseci'] },
    { seconds: 604800, unit: 'week', forms: ['nedelju', 'nedelje', 'nedelja'] },
    { seconds: 86400, unit: 'day', forms: ['dan', 'dana', 'dana'] },
    { seconds: 3600, unit: 'hour', forms: ['sat', 'sata', 'sati'] },
    { seconds: 60, unit: 'minute', forms: ['minut', 'minuta', 'minuta'] },
];

/**
 * How long ago something happened, in words people actually use: "pre 2
 * dana", "2 days ago", "2 дня назад". Anything under a minute reads as
 * "just now" rather than "0 minutes ago".
 *
 * Serbian is spelled out here rather than left to Intl, whose Serbian Latin
 * data not every browser carries - and Serbian is the language most readers
 * see.
 */
export function formatRelativeTime(value: string | Date | null | undefined): string {
    if (!value) {
        return '';
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

    for (const unit of RELATIVE_UNITS) {
        if (seconds >= unit.seconds) {
            const count = Math.floor(seconds / unit.seconds);

            return currentLocale() === 'sr'
                ? `pre ${count} ${plural(count, ...unit.forms)}`
                : new Intl.RelativeTimeFormat(intlLocale(), { numeric: 'always' }).format(-count, unit.unit);
        }
    }

    return t('upravo sada');
}
