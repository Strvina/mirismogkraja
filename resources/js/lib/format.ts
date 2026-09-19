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
