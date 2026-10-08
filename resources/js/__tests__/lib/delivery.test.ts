import { deliveryMethodLabel } from '@/lib/delivery';
import { loadLocale } from '@/lib/i18n';
import { describe, expect, it } from 'vitest';

describe('deliveryMethodLabel', () => {
    it.each([
        ['licna_dostava', 'Lična dostava'],
        ['kurirska_sluzba', 'Kurirska služba'],
        ['preuzimanje', 'Lično preuzimanje'],
    ])('names the stored key %s in plain words', (key, label) => {
        expect(deliveryMethodLabel(key)).toBe(label);
    });

    it("shows a producer's own wording as they wrote it", () => {
        expect(deliveryMethodLabel('Dostava autobusom do Niša')).toBe('Dostava autobusom do Niša');
    });

    it('translates the usual methods but not the own wording', async () => {
        await loadLocale('en');

        expect(deliveryMethodLabel('preuzimanje')).not.toBe('Lično preuzimanje');
        expect(deliveryMethodLabel('Dostava autobusom do Niša')).toBe('Dostava autobusom do Niša');
    });
});
