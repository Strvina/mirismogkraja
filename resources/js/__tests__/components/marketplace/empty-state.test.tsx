import EmptyState from '@/components/marketplace/empty-state';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('EmptyState', () => {
    it('says what belongs here and offers the way forward', () => {
        render(
            <EmptyState title="Još nema poruka" actions={<a href="/proizvodi">Pogledaj proizvode</a>}>
                Razgovor počinje upitom sa stranice proizvoda.
            </EmptyState>,
        );

        expect(screen.getByText('Još nema poruka')).toBeVisible();
        expect(screen.getByText('Razgovor počinje upitom sa stranice proizvoda.')).toBeVisible();
        expect(screen.getByRole('link', { name: 'Pogledaj proizvode' })).toHaveAttribute('href', '/proizvodi');
    });

    it('is just the title when there is nothing more to say or do', () => {
        const { container } = render(<EmptyState title="Nema proizvoda" />);

        expect(container).toHaveTextContent(/^Nema proizvoda$/);
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
});
