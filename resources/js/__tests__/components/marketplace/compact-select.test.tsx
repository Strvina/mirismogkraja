import { createUser } from '@/__tests__/support/render';
import CompactSelect from '@/components/marketplace/compact-select';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const OPTIONS = [
    { value: '', label: 'Najnovije' },
    { value: 'price_asc', label: 'Cena: niža prvo' },
    { value: 'price_desc', label: 'Cena: viša prvo' },
];

function renderSelect(value: string, label?: string) {
    const onChange = vi.fn();

    render(<CompactSelect value={value} label={label} options={OPTIONS} onChange={onChange} />);

    return { user: createUser(), onChange, button: screen.getByRole('button') };
}

describe('CompactSelect', () => {
    it('shows the chosen option on its button', () => {
        const { button } = renderSelect('price_asc');

        expect(button).toHaveTextContent('Cena: niža prvo');
    });

    it('shows the first option for a value it does not know', () => {
        const { button } = renderSelect('popularity');

        expect(button).toHaveTextContent('Najnovije');
    });

    it('is named by its label together with what it shows, when no visible label points at it', () => {
        renderSelect('price_desc', 'Sortiraj');

        expect(screen.getByRole('button', { name: 'Sortiraj: Cena: viša prvo' })).toBeInTheDocument();
    });

    it('keeps its list closed until asked', () => {
        renderSelect('');

        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('lists the options with the chosen one marked', async () => {
        const { user, button } = renderSelect('price_asc');

        await user.click(button);

        expect(screen.getAllByRole('menuitemradio').map((option) => option.textContent)).toEqual(OPTIONS.map((option) => option.label));
        expect(screen.getByRole('menuitemradio', { checked: true })).toHaveTextContent('Cena: niža prvo');
    });

    it('reports the value of the option that was picked and closes', async () => {
        const { user, button, onChange } = renderSelect('');

        await user.click(button);
        await user.click(screen.getByRole('menuitemradio', { name: 'Cena: viša prvo' }));

        expect(onChange).toHaveBeenCalledExactlyOnceWith('price_desc');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('can be worked from the keyboard', async () => {
        const { user, button, onChange } = renderSelect('');

        button.focus();
        await user.keyboard('{Enter}{ArrowDown}{Enter}');

        expect(onChange).toHaveBeenCalledExactlyOnceWith('price_asc');
    });

    it('reports nothing when the list is closed without a choice', async () => {
        const { user, button, onChange } = renderSelect('');

        await user.click(button);
        await user.keyboard('{Escape}');

        expect(onChange).not.toHaveBeenCalled();
    });

    it('is empty rather than broken with no options at all', () => {
        render(<CompactSelect value="" label="Mesto" options={[]} onChange={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'Mesto:' })).toBeInTheDocument();
    });
});
