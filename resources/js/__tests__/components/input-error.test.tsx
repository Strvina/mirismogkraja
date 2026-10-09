import InputError from '@/components/input-error';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('InputError', () => {
    it('shows the message the server sent for the field', () => {
        render(<InputError message="Ovo polje je obavezno." />);

        expect(screen.getByText('Ovo polje je obavezno.')).toBeVisible();
    });

    it('takes no room at all while the field is fine', () => {
        const { container } = render(<InputError />);

        expect(container).toBeEmptyDOMElement();
    });

    it('treats an empty message as no message', () => {
        const { container } = render(<InputError message="" />);

        expect(container).toBeEmptyDOMElement();
    });

    it('passes on what links it to its field', () => {
        render(<InputError message="Lozinka je prekratka." id="password-error" />);

        expect(screen.getByText('Lozinka je prekratka.')).toHaveAttribute('id', 'password-error');
    });
});
