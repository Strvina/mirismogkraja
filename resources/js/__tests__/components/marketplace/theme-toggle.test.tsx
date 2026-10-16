import { renderOnPage } from '@/__tests__/support/render';
import ThemeToggle from '@/components/marketplace/theme-toggle';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('ThemeToggle', () => {
    it('turns the site dark with one click, and remembers it', async () => {
        const { user } = renderOnPage(<ThemeToggle />);
        const toggle = screen.getByRole('button', { name: 'Tamna tema' });

        expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await user.click(toggle);

        expect(document.documentElement).toHaveClass('dark');
        expect(localStorage.getItem('appearance')).toBe('dark');
        expect(toggle).toHaveAttribute('aria-pressed', 'true');
    });

    it('turns it light again with the next', async () => {
        localStorage.setItem('appearance', 'dark');
        const { user } = renderOnPage(<ThemeToggle />);

        await user.click(screen.getByRole('button', { name: 'Tamna tema' }));

        expect(document.documentElement).not.toHaveClass('dark');
        expect(localStorage.getItem('appearance')).toBe('light');
    });
});
