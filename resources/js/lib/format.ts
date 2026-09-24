const priceFormatter = new Intl.NumberFormat('sr-RS', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

/**
 * Prices arrive from Eloquent as decimal strings ("1250.00"). Render them
 * the way prices are written in Serbian: "1.250 RSD".
 */
export function formatPrice(value: string | number): string {
    return `${priceFormatter.format(Number(value))} RSD`;
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

const RELATIVE_UNITS: { seconds: number; forms: [string, string, string] }[] = [
    { seconds: 31536000, forms: ['godinu', 'godine', 'godina'] },
    { seconds: 2592000, forms: ['mesec', 'meseca', 'meseci'] },
    { seconds: 604800, forms: ['nedelju', 'nedelje', 'nedelja'] },
    { seconds: 86400, forms: ['dan', 'dana', 'dana'] },
    { seconds: 3600, forms: ['sat', 'sata', 'sati'] },
    { seconds: 60, forms: ['minut', 'minuta', 'minuta'] },
];

/**
 * How long ago something happened, in words people actually use: "pre 2
 * dana", "pre 5 sati". Anything under a minute reads as "upravo sada"
 * rather than "pre 0 minuta".
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

            return `pre ${count} ${plural(count, ...unit.forms)}`;
        }
    }

    return 'upravo sada';
}
