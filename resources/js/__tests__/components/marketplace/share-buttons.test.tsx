import { createUser } from '@/__tests__/support/render';
import ShareButtons from '@/components/marketplace/share-buttons';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const URL = 'https://vrelinajuga.rs/proizvod/domaci-ajvar?ref=a&b=1';
const TITLE = 'Domaći ajvar & ljutenica';

describe('ShareButtons', () => {
    it('links to each network with the title and the address safely encoded', () => {
        render(<ShareButtons url={URL} title={TITLE} />);

        const text = encodeURIComponent(`${TITLE} — ${URL}`);

        expect(screen.getByRole('link', { name: 'Podeli na Viber' })).toHaveAttribute('href', `viber://forward?text=${text}`);
        expect(screen.getByRole('link', { name: 'Podeli na WhatsApp' })).toHaveAttribute('href', `https://wa.me/?text=${text}`);
        expect(screen.getByRole('link', { name: 'Podeli na Facebook' })).toHaveAttribute(
            'href',
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(URL)}`,
        );
    });

    it('opens them in a new tab without handing the page over', () => {
        render(<ShareButtons url={URL} title={TITLE} />);

        screen.getAllByRole('link').forEach((link) => {
            expect(link).toHaveAttribute('target', '_blank');
            expect(link).toHaveAttribute('rel', 'noreferrer');
        });
    });

    it('copies the address itself and says so for two seconds', async () => {
        vi.useFakeTimers();
        const user = createUser();
        render(<ShareButtons url={URL} title={TITLE} />);

        expect(screen.queryByText('Link je kopiran')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Kopiraj link' }));

        expect(await navigator.clipboard.readText()).toBe(URL);
        expect(screen.getByText('Link je kopiran')).toBeVisible();

        act(() => vi.advanceTimersByTime(1999));
        expect(screen.getByText('Link je kopiran')).toBeVisible();

        act(() => vi.advanceTimersByTime(1));
        expect(screen.queryByText('Link je kopiran')).not.toBeInTheDocument();
    });

    it('quietly does nothing when the browser refuses the clipboard', async () => {
        const user = createUser();
        render(<ShareButtons url={URL} title={TITLE} />);
        vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('NotAllowedError'));

        await user.click(screen.getByRole('button', { name: 'Kopiraj link' }));

        expect(screen.queryByText('Link je kopiran')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Podeli na Viber' })).toBeInTheDocument();
    });
});
