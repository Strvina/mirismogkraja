import PauseNotice from '@/components/marketplace/pause-notice';
import { loadLocale } from '@/lib/i18n';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('PauseNotice', () => {
    it('says the producer takes no new inquiries, with no date when none was given', () => {
        render(<PauseNotice pause={{ until: null, note: null }} />);

        expect(screen.getByText('Trenutno ne prima nove upite.')).toBeVisible();
    });

    it('says when they are back, if they said', () => {
        render(<PauseNotice pause={{ until: '2026-11-15', note: null }} />);

        expect(screen.getByText('Trenutno ne prima nove upite, do 15. novembar.')).toBeVisible();
    });

    it("writes the date in the reader's language", async () => {
        await loadLocale('en');
        const { container } = render(<PauseNotice pause={{ until: '2026-11-15', note: null }} />);

        expect(container).toHaveTextContent('15 November');
    });

    it("shows the producer's own note", () => {
        render(<PauseNotice pause={{ until: null, note: 'Ovogodišnji ajvar je rasprodat, novi stiže u septembru.' }} />);

        expect(screen.getByText('Ovogodišnji ajvar je rasprodat, novi stiže u septembru.')).toBeVisible();
    });

    it('carries whatever the page offers instead of writing', () => {
        render(
            <PauseNotice pause={{ until: null, note: null }}>
                <button type="button">Javi mi kad se vrati</button>
            </PauseNotice>,
        );

        expect(screen.getByRole('button', { name: 'Javi mi kad se vrati' })).toBeInTheDocument();
    });

    it('is only the one sentence when there is no note and nothing to offer', () => {
        const { container } = render(<PauseNotice pause={{ until: null, note: null }} />);

        expect(container).toHaveTextContent(/^Trenutno ne prima nove upite\.$/);
    });
});
