import { DARK_SCHEME, setMediaQuery } from '@/__tests__/support/browser';
import { createUser } from '@/__tests__/support/render';
import AppearanceToggleTab from '@/components/appearance-tabs';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const isDark = () => document.documentElement.classList.contains('dark');

describe('AppearanceToggleTab', () => {
    it('offers light, dark and "as on the device"', () => {
        render(<AppearanceToggleTab />);

        expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Svetla', 'Tamna', 'Kao na uređaju']);
    });

    it('turns the site dark at once and remembers the choice', async () => {
        const user = createUser();
        render(<AppearanceToggleTab />);

        await user.click(screen.getByRole('button', { name: 'Tamna' }));

        expect(isDark()).toBe(true);
        expect(localStorage.getItem('appearance')).toBe('dark');
    });

    it('turns it light again', async () => {
        const user = createUser();
        localStorage.setItem('appearance', 'dark');
        render(<AppearanceToggleTab />);
        expect(isDark()).toBe(true);

        await user.click(screen.getByRole('button', { name: 'Svetla' }));

        expect(isDark()).toBe(false);
        expect(localStorage.getItem('appearance')).toBe('light');
    });

    it('follows the device when asked to', async () => {
        const user = createUser();
        setMediaQuery(DARK_SCHEME, true);
        localStorage.setItem('appearance', 'light');
        render(<AppearanceToggleTab />);
        expect(isDark()).toBe(false);

        await user.click(screen.getByRole('button', { name: 'Kao na uređaju' }));

        expect(isDark()).toBe(true);
        expect(localStorage.getItem('appearance')).toBe('system');
    });
});
