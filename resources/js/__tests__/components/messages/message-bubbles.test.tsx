import { makeMessage } from '@/__tests__/support/factories';
import { createUser, freezeDate, renderOnPage } from '@/__tests__/support/render';
import { MessageBubble, PendingBubble } from '@/components/messages/message-bubbles';
import { type PendingMessage } from '@/components/messages/types';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('MessageBubble', () => {
    beforeEach(() => freezeDate('2026-10-12T10:00:00Z'));

    it('shows the text, who sent it and how long ago', () => {
        const { container } = renderOnPage(
            <MessageBubble
                message={makeMessage({
                    body: 'Da li imate ajvar?',
                    sender: { id: 2, name: 'Petar Petrović', avatar_path: null },
                    created_at: '2026-10-12T08:00:00Z',
                })}
            />,
        );

        expect(screen.getByText('Da li imate ajvar?')).toBeVisible();
        expect(container).toHaveTextContent('Petar Petrović · pre 2 sata');
    });

    it('is a plain message when it was not sent from a product or about an ad', () => {
        renderOnPage(<MessageBubble message={makeMessage()} />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    describe('an inquiry sent from a product page', () => {
        const product = { id: 9, name: 'Domaći ajvar', slug: 'domaci-ajvar', price: '650.00', unit: 'kom', image: null as string | null };

        it('shows which product it was about, as a link to it, with the asking price', () => {
            renderOnPage(<MessageBubble message={makeMessage({ product })} />);

            const link = screen.getByRole('link', { name: /Domaći ajvar/ });

            expect(link).toHaveAttribute('href', route('marketplace.products.show', 'domaci-ajvar'));
            expect(link).toHaveTextContent('650 RSD / kom');
        });

        it('shows the photo of the product when it has one', () => {
            renderOnPage(<MessageBubble message={makeMessage({ product: { ...product, image: 'products/ajvar.jpg' } })} />);

            expect(screen.getByRole('link', { name: /Domaći ajvar/ }).querySelector('img')).toHaveAttribute('src', '/storage/products/ajvar.jpg');
        });

        it('does without a photo', () => {
            renderOnPage(<MessageBubble message={makeMessage({ product })} />);

            expect(screen.getByRole('link', { name: /Domaći ajvar/ }).querySelector('img')).toBeNull();
        });
    });

    it("shows which ad a producer's answer is to, as a link to the ad", () => {
        renderOnPage(<MessageBubble message={makeMessage({ wanted_ad: { id: 12, title: 'Paprika za ajvar, 50 kg' } })} />);

        const link = screen.getByRole('link', { name: /Paprika za ajvar, 50 kg/ });

        expect(link).toHaveAttribute('href', route('wanted.show', 12));
        expect(link).toHaveTextContent('Odgovor na oglas');
    });
});

describe('PendingBubble', () => {
    const pending = (overrides: Partial<PendingMessage> = {}): PendingMessage => ({
        key: 1,
        body: 'Da li imate ajvar?',
        created_at: '2026-10-12T09:59:55Z',
        failed: false,
        ...overrides,
    });

    function renderBubble(message: PendingMessage) {
        const onRetry = vi.fn();
        const onDiscard = vi.fn();

        renderOnPage(<PendingBubble message={message} senderName="Milica Nikolić" onRetry={onRetry} onDiscard={onDiscard} />);

        return { user: createUser(), onRetry, onDiscard };
    }

    beforeEach(() => freezeDate('2026-10-12T10:00:00Z'));

    it('looks like a delivered message while it is on its way: no spinner, no "sending"', () => {
        renderBubble(pending());

        expect(screen.getByText('Da li imate ajvar?')).toBeVisible();
        expect(screen.getByText('Milica Nikolić · upravo sada')).toBeVisible();
        expect(screen.queryByText('Nije poslato')).not.toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('says so when it could not be sent, and keeps the text in the thread', () => {
        renderBubble(pending({ failed: true }));

        expect(screen.getByText('Da li imate ajvar?')).toBeVisible();
        expect(screen.getByText('Nije poslato')).toBeVisible();
        expect(screen.queryByText(/upravo sada/)).not.toBeInTheDocument();
    });

    it('offers to send a failed message again', async () => {
        const { user, onRetry, onDiscard } = renderBubble(pending({ failed: true }));

        await user.click(screen.getByRole('button', { name: 'Pokušaj ponovo' }));

        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(onDiscard).not.toHaveBeenCalled();
    });

    it('offers to drop it', async () => {
        const { user, onRetry, onDiscard } = renderBubble(pending({ failed: true }));

        await user.click(screen.getByRole('button', { name: 'Odbaci' }));

        expect(onDiscard).toHaveBeenCalledTimes(1);
        expect(onRetry).not.toHaveBeenCalled();
    });
});
