import { createUser } from '@/__tests__/support/render';
import { SortMenu } from '@/components/marketplace/mobile-filters';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const OPTIONS = [
    { value: '', label: 'Najnovije' },
    { value: 'price_asc', label: 'Cena: niža prvo' },
];

describe('SortMenu', () => {
    it('opens a sheet with the orders, the one in force marked, and closes on its cross', async () => {
        const onChange = vi.fn();
        render(<SortMenu value="" options={OPTIONS} onChange={onChange} />);
        const user = createUser();

        await user.click(screen.getByRole('button', { name: 'Sortiraj' }));
        const sheet = screen.getByRole('dialog', { name: 'Sortiraj' });
        expect(within(sheet).getByRole('button', { name: 'Najnovije' })).toHaveAttribute('aria-pressed', 'true');

        await user.click(within(sheet).getByRole('button', { name: 'Zatvori' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('applies a choice at once and closes', async () => {
        const onChange = vi.fn();
        render(<SortMenu value="" options={OPTIONS} onChange={onChange} />);
        const user = createUser();

        await user.click(screen.getByRole('button', { name: 'Sortiraj' }));
        await user.click(within(screen.getByRole('dialog', { name: 'Sortiraj' })).getByRole('button', { name: 'Cena: niža prvo' }));

        expect(onChange).toHaveBeenCalledExactlyOnceWith('price_asc');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
