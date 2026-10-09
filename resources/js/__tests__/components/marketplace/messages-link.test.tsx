import { renderOnPage } from '@/__tests__/support/render';
import MessagesLink from '@/components/marketplace/messages-link';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('MessagesLink', () => {
    it('is a plain link to the inbox when nothing is unread', () => {
        renderOnPage(<MessagesLink />, { props: { unreadMessages: 0 } });

        const link = screen.getByRole('link', { name: 'Poruke' });

        expect(link).toHaveAttribute('href', route('messages.index'));
        expect(link.textContent).toBe('');
    });

    it('says how many are unread, to the eye and to a screen reader', () => {
        renderOnPage(<MessagesLink />, { props: { unreadMessages: 3 } });

        expect(screen.getByRole('link', { name: 'Poruke (3 nepročitanih)' })).toHaveTextContent('3');
    });

    it('shows 99+ on the badge but reads the real number out', () => {
        renderOnPage(<MessagesLink />, { props: { unreadMessages: 250 } });

        expect(screen.getByRole('link', { name: 'Poruke (250 nepročitanih)' })).toHaveTextContent('99+');
    });

    it('shows exactly 99 as 99', () => {
        renderOnPage(<MessagesLink />, { props: { unreadMessages: 99 } });

        expect(screen.getByRole('link', { name: 'Poruke (99 nepročitanih)' })).toHaveTextContent(/^99$/);
    });
});
