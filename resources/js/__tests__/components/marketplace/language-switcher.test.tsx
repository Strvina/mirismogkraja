import { visits } from '@/__tests__/support/inertia';
import { createUser } from '@/__tests__/support/render';
import LanguageSwitcher from '@/components/marketplace/language-switcher';
import { loadLocale } from '@/lib/i18n';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('LanguageSwitcher', () => {
    it('shows the language the page is in, and is named by what it shows', () => {
        render(<LanguageSwitcher />);

        expect(screen.getByRole('button', { name: 'Jezik: SR' })).toHaveTextContent('SR');
    });

    it.each([
        ['en', 'EN'],
        ['ru', 'RU'],
    ])('shows %s as %s', async (locale, short) => {
        await loadLocale(locale);
        render(<LanguageSwitcher />);

        expect(screen.getByRole('button')).toHaveTextContent(short);
        expect(screen.getByRole('button')).toHaveAccessibleName(new RegExp(`: ${short}$`));
    });

    it('offers the three languages, each by its own name and marked with its own language', async () => {
        const user = createUser();
        render(<LanguageSwitcher />);

        await user.click(screen.getByRole('button', { name: 'Jezik: SR' }));

        const choices = screen.getAllByRole('menuitem');

        expect(choices.map((choice) => choice.textContent)).toEqual(['Srpski', 'English', 'Русский']);
        expect(choices.map((choice) => choice.getAttribute('lang'))).toEqual(['sr', 'en', 'ru']);
    });

    it('makes each choice a plain link the server answers with a full page', async () => {
        const user = createUser();
        render(<LanguageSwitcher />);

        await user.click(screen.getByRole('button', { name: 'Jezik: SR' }));

        const english = screen.getByRole('menuitem', { name: 'English' });

        expect(english).toHaveAttribute('href', route('locale', 'en'));
        expect(screen.getByRole('menuitem', { name: 'Русский' })).toHaveAttribute('href', route('locale', 'ru'));

        english.addEventListener('click', (event) => event.preventDefault());
        await user.click(english);

        expect(visits()).toHaveLength(0);
    });
});
