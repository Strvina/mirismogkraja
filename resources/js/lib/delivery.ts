/** Mirrors Producer::DELIVERY_METHODS. */
export const DELIVERY_METHOD_LABELS: Record<string, string> = {
    licna_dostava: 'Lična dostava',
    kurirska_sluzba: 'Kurirska služba',
    preuzimanje: 'Lično preuzimanje',
};

export function deliveryMethodLabel(method: string): string {
    return DELIVERY_METHOD_LABELS[method] ?? method;
}
