import { makeReview, paginated } from '@/__tests__/support/factories';
import { lastVisit, visits } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import ReportButton from '@/components/marketplace/report-button';
import ReviewCard from '@/components/marketplace/review-card';
import ReviewsSection from '@/components/producer-page/reviews-section';
import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('server validation feedback', () => {
    it('keeps a rejected report editable and announces its error', async () => {
        const { user } = renderOnPage(<ReportButton type="product" id={7} reasons={{ spam: 'Spam' }} />);
        await user.click(screen.getByRole('button', { name: 'Prijavi problem' }));
        await user.click(screen.getByRole('button', { name: 'Pošalji prijavu' }));
        act(() => lastVisit().fail({ reason: 'Prijava već postoji.' }));
        expect(screen.getByRole('alert')).toHaveTextContent('Prijava već postoji.');
        expect(screen.getByRole('button', { name: 'Pošalji prijavu' })).toBeEnabled();
    });

    it('prevents duplicate reviews while sending and displays errors', async () => {
        const { user } = renderOnPage(
            <ReviewsSection producer={{ id: 7, name: 'Ana' }} reviews={paginated([])} myPendingReview={null} canReview canReply={false} signedIn />,
        );
        const submit = screen.getByRole('button', { name: 'Pošalji utisak' });
        await user.click(submit);
        await user.click(submit);
        expect(visits()).toHaveLength(1);
        expect(submit).toBeDisabled();
        act(() => lastVisit().fail({ comment: 'Upišite utisak.' }));
        expect(screen.getByRole('alert')).toHaveTextContent('Upišite utisak.');
        expect(submit).toBeEnabled();
    });

    it('shows a rejected reply without closing the editor', async () => {
        const { user } = renderOnPage(<ReviewCard review={makeReview()} canReply />);
        await user.click(screen.getByRole('button', { name: 'Odgovori na utisak' }));
        await user.click(screen.getByRole('button', { name: 'Objavi odgovor' }));
        act(() => lastVisit().fail({ reply: 'Odgovor je obavezan.' }));
        expect(screen.getByRole('alert')).toHaveTextContent('Odgovor je obavezan.');
        expect(screen.getByRole('textbox', { name: 'Vaš odgovor' })).toBeVisible();
    });
});
