import { makeReview, paginated } from '@/__tests__/support/factories';
import { lastVisit, visits } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import { type ReviewWithAuthor } from '@/components/marketplace/review-card';
import ReviewsSection from '@/components/producer-page/reviews-section';
import { screen, within } from '@testing-library/react';
import { type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

// Shrinking needs a canvas; its own tests cover it. Here a photo comes back
// under a new name, so it is plain that the shrunken one is what is sent.
vi.mock('@/lib/shrink-image', () => ({
    shrinkImage: vi.fn(async (file: File) => new File([file], `smanjena-${file.name}`, { type: file.type })),
}));

type Props = ComponentProps<typeof ReviewsSection>;

function renderSection(overrides: Partial<Props> = {}, reviews: ReviewWithAuthor[] = []) {
    const props: Props = {
        producer: { id: 7, name: 'Mlekara Zapis' },
        reviews: paginated(reviews),
        myPendingReview: null,
        canReview: false,
        canReply: false,
        signedIn: false,
        ...overrides,
    };

    return renderOnPage(<ReviewsSection {...props} />);
}

const form = () => screen.getByRole('heading', { name: 'Ostavi utisak' }).closest('form') as HTMLFormElement;

describe('ReviewsSection', () => {
    describe('what buyers have said', () => {
        it('says so when nobody has said anything yet', () => {
            renderSection();

            expect(screen.getByRole('heading', { name: 'Utisci kupaca' })).toBeVisible();
            expect(screen.getByText('Još niko nije ostavio utisak o ovom proizvođaču.')).toBeVisible();
        });

        it("lists the published impressions, the producer's answers signed with its name", () => {
            renderSection({}, [
                makeReview({ id: 1, comment: 'Odličan sir.', reply: 'Hvala!' }),
                makeReview({ id: 2, comment: 'Stiglo na vreme.', user: { name: 'Petar', avatar_path: null } }),
            ]);

            expect(screen.getAllByRole('article')).toHaveLength(2);
            expect(screen.getByText('Odgovor proizvođača „Mlekara Zapis”')).toBeVisible();
            expect(screen.queryByText('Još niko nije ostavio utisak o ovom proizvođaču.')).not.toBeInTheDocument();
        });

        it('pages through them when there are many', () => {
            renderSection({ reviews: paginated([makeReview()], { page: 1, lastPage: 3 }) });

            expect(screen.getByRole('navigation', { name: 'Stranice' })).toBeInTheDocument();
        });

        it('lets the producer answer on their own page, and nobody else', () => {
            const { unmount } = renderSection({ canReply: true }, [makeReview()]);
            expect(screen.getByRole('button', { name: 'Odgovori na utisak' })).toBeInTheDocument();
            unmount();

            renderSection({ canReply: false }, [makeReview()]);
            expect(screen.queryByRole('button', { name: 'Odgovori na utisak' })).not.toBeInTheDocument();
        });
    });

    describe("the visitor's own review, still with a moderator", () => {
        const mine = makeReview({ id: 9, status: 'pending', comment: 'Moj utisak koji čeka.' });

        it('sits where it will live once published, marked as waiting', () => {
            renderSection({ myPendingReview: mine, signedIn: true });

            expect(screen.getByText('Moj utisak koji čeka.')).toBeVisible();
            expect(screen.getByText('Čekamo odobrenje — nakon provere vaš utisak će biti objavljen.')).toBeVisible();
        });

        it('stands in for "nobody has said anything yet"', () => {
            renderSection({ myPendingReview: mine, signedIn: true });

            expect(screen.queryByText('Još niko nije ostavio utisak o ovom proizvođaču.')).not.toBeInTheDocument();
        });

        it('means there is no second one to write, and nothing more to explain', () => {
            renderSection({ myPendingReview: mine, signedIn: true });

            expect(screen.queryByRole('heading', { name: 'Ostavi utisak' })).not.toBeInTheDocument();
            expect(screen.queryByText(/Utisak možete ostaviti/)).not.toBeInTheDocument();
        });
    });

    describe('who may write one', () => {
        it('tells a guest that impressions come from signed-in buyers who have talked to the producer', () => {
            renderSection({ signedIn: false });

            expect(screen.getByText('Utiske ostavljaju prijavljeni korisnici koji su se dopisivali sa proizvođačem.')).toBeVisible();
            expect(screen.queryByRole('heading', { name: 'Ostavi utisak' })).not.toBeInTheDocument();
        });

        it('tells a buyer the producer has not answered yet that they can once it has', () => {
            renderSection({ signedIn: true });

            expect(screen.getByText('Utisak možete ostaviti kada vam se proizvođač javi na vašu poruku.')).toBeVisible();
            expect(screen.queryByRole('heading', { name: 'Ostavi utisak' })).not.toBeInTheDocument();
        });

        it('gives the form to a buyer the producer has answered, without either explanation', () => {
            renderSection({ canReview: true, signedIn: true });

            expect(screen.getByRole('heading', { name: 'Ostavi utisak' })).toBeVisible();
            expect(screen.queryByText(/Utisak možete ostaviti/)).not.toBeInTheDocument();
            expect(screen.queryByText(/Utiske ostavljaju/)).not.toBeInTheDocument();
        });
    });

    describe('the review form', () => {
        const rating = () => within(form()).getByLabelText('Vaša ocena');
        const comment = () => within(form()).getByRole('textbox', { name: 'Vaš utisak' });
        const send = () => within(form()).getByRole('button', { name: 'Pošalji utisak' });

        it('starts on five stars and offers five down to one', () => {
            renderSection({ canReview: true, signedIn: true });

            expect(rating()).toHaveValue('5');
            expect(
                within(rating())
                    .getAllByRole('option')
                    .map((option) => option.textContent),
            ).toEqual(['★★★★★ (5)', '★★★★ (4)', '★★★ (3)', '★★ (2)', '★ (1)']);
        });

        it('says the review is published only after it has been looked at', () => {
            renderSection({ canReview: true, signedIn: true });

            expect(form()).toHaveTextContent('Objavljujemo ga pošto ga pregledamo.');
        });

        it('can be sent as a grade alone', async () => {
            const { user } = renderSection({ canReview: true, signedIn: true });

            await user.click(send());

            expect(lastVisit()).toMatchObject({
                method: 'post',
                url: route('reviews.store', 7),
                data: { rating: 5, comment: '', image: null },
                options: { forceFormData: true },
            });
        });

        it('sends the chosen grade as a number, with what was written', async () => {
            const { user } = renderSection({ canReview: true, signedIn: true });

            await user.selectOptions(rating(), '3');
            await user.type(comment(), 'Sir je dobar, dostava je kasnila.');
            await user.click(send());

            expect(lastVisit()).toMatchObject({ data: { rating: 3, comment: 'Sir je dobar, dostava je kasnila.', image: null } });
        });

        it('sends the photo shrunken, as form data', async () => {
            const { user } = renderSection({ canReview: true, signedIn: true });
            const photo = new File(['slika'], 'sir.jpg', { type: 'image/jpeg' });

            await user.upload(within(form()).getByLabelText('Slika onoga što ste dobili (nije obavezno)'), photo);
            await user.click(send());

            expect((lastVisit().data as { image: File | null }).image?.name).toBe('smanjena-sir.jpg');
            expect(lastVisit().options).toMatchObject({ forceFormData: true });
        });

        it('empties the text once the review is in', async () => {
            const { user } = renderSection({ canReview: true, signedIn: true });

            await user.type(comment(), 'Odličan sir.');
            await user.click(send());
            lastVisit().succeed();

            expect(comment()).toHaveValue('');
        });

        it('keeps what was written when the server refuses it, so it can be sent again', async () => {
            const { user } = renderSection({ canReview: true, signedIn: true });

            await user.type(comment(), 'Odličan sir.');
            await user.click(send());
            lastVisit().fail({ comment: 'Utisak je predugačak.' });

            expect(comment()).toHaveValue('Odličan sir.');

            await user.click(send());

            expect(visits()).toHaveLength(2);
        });
    });
});
