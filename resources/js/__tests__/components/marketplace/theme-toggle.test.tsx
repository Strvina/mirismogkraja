import { renderOnPage } from '@/__tests__/support/render';
import ThemeToggle from '@/components/marketplace/theme-toggle';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('ThemeToggle', () => {
    it('switches the site to the dark theme from the header and remembers it', async () => {
        const { user } = renderOnPage(<ThemeToggle />);

        await user.click(screen.getByRole('button', { name: 'Tema sajta' }));
        await user.click(screen.getByRole('menuitemradio', { name: 'Tamna' }));

        expect(document.documentElement).toHaveClass('dark');
        expect(localStorage.getItem('appearance')).toBe('dark');
    });

    it('goes back to light', async () => {
        localStorage.setItem('appearance', 'dark');
        const { user } = renderOnPage(<ThemeToggle />);

        await user.click(screen.getByRole('button', { name: 'Tema sajta' }));
        await user.click(screen.getByRole('menuitemradio', { name: 'Svetla' }));

        expect(document.documentElement).not.toHaveClass('dark');
        expect(localStorage.getItem('appearance')).toBe('light');
    });
});
