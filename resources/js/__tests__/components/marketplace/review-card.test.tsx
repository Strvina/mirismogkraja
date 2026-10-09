import { makeReview } from '@/__tests__/support/factories';
import { lastVisit, visits } from '@/__tests__/support/inertia';
import { freezeDate, renderOnPage } from '@/__tests__/support/render';
import ReviewCard from '@/components/marketplace/review-card';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const card = () => screen.getByRole('article');

describe('ReviewCard', () => {
    it('shows who wrote it, the grade, the text and how long ago', () => {
        freezeDate('2026-10-04T08:00:00Z');
        renderOnPage(<ReviewCard review={makeReview({ rating: 4, comment: 'Odličan sir.', created_at: '2026-10-01T08:00:00Z' })} />);

        expect(screen.getByText('Jovana Jovanović')).toBeVisible();
        expect(screen.getByText('Provereni korisnik')).toBeVisible();
        expect(screen.getByLabelText('Ocena 4 od 5')).toBeInTheDocument();
        expect(screen.getByText('Odličan sir.')).toBeVisible();
        expect(screen.getByText('pre 3 dana')).toBeVisible();
    });

    it('draws one star per point of the grade', () => {
        renderOnPage(<ReviewCard review={makeReview({ rating: 2 })} />);

        expect(screen.getByLabelText('Ocena 2 od 5').querySelectorAll('svg')).toHaveLength(2);
    });

    it('shows a review that is only a grade', () => {
        renderOnPage(<ReviewCard review={makeReview({ comment: null })} />);

        expect(card()).not.toHaveTextContent('Odličan sir');
        expect(screen.getByLabelText('Ocena 5 od 5')).toBeInTheDocument();
    });

    it("shows the buyer's photo, described as one", () => {
        renderOnPage(<ReviewCard review={makeReview({ image_path: 'reviews/sir.jpg' })} />);

        expect(screen.getByRole('img', { name: 'Slika uz utisak kupca' })).toHaveAttribute('src', '/storage/reviews/sir.jpg');
    });

    it('tells its author it is waiting for approval', () => {
        renderOnPage(<ReviewCard review={makeReview({ status: 'pending' })} pending />);

        expect(screen.getByText('Čekamo odobrenje — nakon provere vaš utisak će biti objavljen.')).toBeVisible();
    });

    it('says nothing about approval once published', () => {
        renderOnPage(<ReviewCard review={makeReview()} />);

        expect(card()).not.toHaveTextContent('Čekamo odobrenje');
    });

    describe("the producer's answer", () => {
        it('is shown under the review, signed with the name of the producer', () => {
            renderOnPage(<ReviewCard review={makeReview({ reply: 'Hvala, dođite opet!' })} producerName="Mlekara Zapis" />);

            expect(screen.getByText('Odgovor proizvođača „Mlekara Zapis”')).toBeVisible();
            expect(screen.getByText('Hvala, dođite opet!')).toBeVisible();
        });

        it('is signed plainly where the name is not known', () => {
            renderOnPage(<ReviewCard review={makeReview({ reply: 'Hvala!' })} />);

            expect(screen.getByText('Odgovor proizvođača')).toBeVisible();
        });

        it('is not there when the producer gave none', () => {
            renderOnPage(<ReviewCard review={makeReview({ reply: null })} producerName="Mlekara Zapis" />);

            expect(card()).not.toHaveTextContent('Odgovor proizvođača');
        });

        it('cannot be written by a visitor', () => {
            renderOnPage(<ReviewCard review={makeReview()} producerName="Mlekara Zapis" />);

            expect(screen.queryByRole('button')).not.toBeInTheDocument();
        });
    });

    describe('for the producer who owns the page', () => {
        const answerBox = () => screen.getByRole('textbox', { name: 'Vaš odgovor' });

        it('offers to answer a review that has no answer', () => {
            renderOnPage(<ReviewCard review={makeReview({ reply: null })} canReply />);

            expect(screen.getByRole('button', { name: 'Odgovori na utisak' })).toBeInTheDocument();
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });

        it('offers to change an answer already given', () => {
            renderOnPage(<ReviewCard review={makeReview({ reply: 'Hvala!' })} canReply />);

            expect(screen.getByRole('button', { name: 'Izmeni odgovor' })).toBeInTheDocument();
        });

        it('publishes the answer', async () => {
            const { user } = renderOnPage(<ReviewCard review={makeReview({ id: 15, reply: null })} canReply />);

            await user.click(screen.getByRole('button', { name: 'Odgovori na utisak' }));
            await user.type(answerBox(), 'Hvala, dođite opet!');
            await user.click(screen.getByRole('button', { name: 'Objavi odgovor' }));

            expect(lastVisit()).toMatchObject({
                method: 'put',
                url: route('reviews.reply', 15),
                data: { reply: 'Hvala, dođite opet!' },
                options: { preserveScroll: true },
            });
        });

        it('starts an edit from the answer as it stands, in place of the published one', async () => {
            const { user } = renderOnPage(<ReviewCard review={makeReview({ reply: 'Hvala!' })} producerName="Mlekara Zapis" canReply />);

            await user.click(screen.getByRole('button', { name: 'Izmeni odgovor' }));

            expect(answerBox()).toHaveValue('Hvala!');
            expect(card()).not.toHaveTextContent('Odgovor proizvođača');
        });

        it('cannot be published twice while it is being saved, and closes the box once it is', async () => {
            const { user } = renderOnPage(<ReviewCard review={makeReview({ reply: null })} canReply />);

            await user.click(screen.getByRole('button', { name: 'Odgovori na utisak' }));
            await user.type(answerBox(), 'Hvala!');
            await user.click(screen.getByRole('button', { name: 'Objavi odgovor' }));

            expect(screen.getByRole('button', { name: 'Objavi odgovor' })).toBeDisabled();

            lastVisit().succeed();

            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });

        it('keeps the box open with the text when the server refuses it', async () => {
            const { user } = renderOnPage(<ReviewCard review={makeReview({ reply: null })} canReply />);

            await user.click(screen.getByRole('button', { name: 'Odgovori na utisak' }));
            await user.type(answerBox(), 'Hvala!');
            await user.click(screen.getByRole('button', { name: 'Objavi odgovor' }));
            lastVisit().fail({ reply: 'Odgovor je predugačak.' });

            expect(answerBox()).toHaveValue('Hvala!');
            expect(screen.getByRole('button', { name: 'Objavi odgovor' })).toBeEnabled();
        });

        it('backs out without sending anything', async () => {
            const { user } = renderOnPage(<ReviewCard review={makeReview({ reply: 'Hvala!' })} canReply />);

            await user.click(screen.getByRole('button', { name: 'Izmeni odgovor' }));
            await user.click(screen.getByRole('button', { name: 'Otkaži' }));

            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
            expect(screen.getByText('Hvala!')).toBeVisible();
            expect(visits()).toHaveLength(0);
        });
    });
});
