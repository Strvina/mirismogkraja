import { t, tx } from '@/lib/i18n';

/** Mirrors Producer::DELIVERY_METHODS. */
export const DELIVERY_METHOD_LABELS: Record<string, string> = {
    licna_dostava: tx('Lična dostava'),
    kurirska_sluzba: tx('Kurirska služba'),
    preuzimanje: tx('Lično preuzimanje'),
};

export function deliveryMethodLabel(method: string): string {
    return t(DELIVERY_METHOD_LABELS[method] ?? method);
}
