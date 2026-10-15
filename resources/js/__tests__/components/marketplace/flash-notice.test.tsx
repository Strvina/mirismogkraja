import { renderOnPage } from '@/__tests__/support/render';
import FlashNotice from '@/components/marketplace/flash-notice';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('FlashNotice', () => {
    it('says what the last action did, until it is closed', async () => {
        const { user } = renderOnPage(<FlashNotice />, { props: { notice: 'Oglas je obrisan.' } });

        expect(screen.getByRole('status')).toHaveTextContent('Oglas je obrisan.');

        await user.click(screen.getByRole('button', { name: 'Zatvori' }));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('shows nothing when nothing happened', () => {
        renderOnPage(<FlashNotice />, { props: { notice: null } });

        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
});
