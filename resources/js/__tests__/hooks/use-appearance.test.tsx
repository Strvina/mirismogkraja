import { DARK_SCHEME, setMediaQuery } from '@/__tests__/support/browser';
import { initializeTheme, useAppearance } from '@/hooks/use-appearance';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const isDark = () => document.documentElement.classList.contains('dark');

describe('initializeTheme', () => {
    it('follows the device when the visitor has chosen nothing', () => {
        setMediaQuery(DARK_SCHEME, true);
        initializeTheme();

        expect(isDark()).toBe(true);
    });

    it('is light on a device that is light', () => {
        initializeTheme();

        expect(isDark()).toBe(false);
    });

    it("keeps the visitor's own choice over the device's", () => {
        localStorage.setItem('appearance', 'dark');
        initializeTheme();
        expect(isDark()).toBe(true);

        localStorage.setItem('appearance', 'light');
        setMediaQuery(DARK_SCHEME, true);
        initializeTheme();
        expect(isDark()).toBe(false);
    });

    it('changes with the device while the page is open', () => {
        initializeTheme();

        setMediaQuery(DARK_SCHEME, true);
        expect(isDark()).toBe(true);

        setMediaQuery(DARK_SCHEME, false);
        expect(isDark()).toBe(false);
    });

    it('does not change with the device once the visitor has chosen a theme', () => {
        localStorage.setItem('appearance', 'light');
        initializeTheme();

        setMediaQuery(DARK_SCHEME, true);

        expect(isDark()).toBe(false);
    });
});

describe('useAppearance', () => {
    it('starts from the saved choice', () => {
        localStorage.setItem('appearance', 'dark');

        const { result } = renderHook(() => useAppearance());

        expect(result.current.appearance).toBe('dark');
        expect(isDark()).toBe(true);
    });

    it('starts from the device when nothing is saved', () => {
        const { result } = renderHook(() => useAppearance());

        expect(result.current.appearance).toBe('system');
        expect(isDark()).toBe(false);
    });

    it('applies a new choice at once and remembers it', () => {
        const { result } = renderHook(() => useAppearance());

        act(() => result.current.updateAppearance('dark'));

        expect(result.current.appearance).toBe('dark');
        expect(isDark()).toBe(true);
        expect(localStorage.getItem('appearance')).toBe('dark');

        act(() => result.current.updateAppearance('light'));

        expect(isDark()).toBe(false);
        expect(localStorage.getItem('appearance')).toBe('light');
    });

    it('goes back to following the device', () => {
        setMediaQuery(DARK_SCHEME, true);
        const { result } = renderHook(() => useAppearance());

        act(() => result.current.updateAppearance('light'));
        expect(isDark()).toBe(false);

        act(() => result.current.updateAppearance('system'));
        expect(isDark()).toBe(true);
        expect(localStorage.getItem('appearance')).toBe('system');
    });
});
