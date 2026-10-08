import { categoryLabel, categoryOptions } from '@/lib/categories';
import { loadLocale } from '@/lib/i18n';
import { describe, expect, it } from 'vitest';

describe('categoryLabel', () => {
    it('shows a general category by its name', () => {
        expect(categoryLabel({ id: 1, name: 'Zimnica' })).toBe('Zimnica');
        expect(categoryLabel({ id: 1, name: 'Zimnica', parent_id: null })).toBe('Zimnica');
    });

    it('sets a subcategory in under its parent with a dash', () => {
        expect(categoryLabel({ id: 2, name: 'Ajvar', parent_id: 1 })).toBe('— Ajvar');
    });

    it('translates the name', async () => {
        await loadLocale('en');

        expect(categoryLabel({ id: 1, name: 'Zimnica' })).not.toBe('Zimnica');
        expect(categoryLabel({ id: 2, name: 'Zimnica', parent_id: 1 })).toMatch(/^— /);
    });
});

describe('categoryOptions', () => {
    it('turns the tree into select options, ids as strings, order kept', () => {
        const options = categoryOptions([
            { id: 1, name: 'Zimnica' },
            { id: 7, name: 'Ajvar', parent_id: 1 },
            { id: 2, name: 'Med' },
        ]);

        expect(options).toEqual([
            { value: '1', label: 'Zimnica' },
            { value: '7', label: '— Ajvar' },
            { value: '2', label: 'Med' },
        ]);
    });

    it('is empty for no categories', () => {
        expect(categoryOptions([])).toEqual([]);
    });
});
