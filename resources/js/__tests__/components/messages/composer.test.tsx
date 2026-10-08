import { visits } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import Composer from '@/components/messages/composer';
import { type QuickReply } from '@/components/messages/types';
import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const REPLIES: QuickReply[] = [
    { id: 1, title: 'Pozdrav', body: 'Dobar dan, {ime}! Hvala što ste se javili.' },
    { id: 2, title: 'Dostava', body: 'Šaljemo kurirskom službom, stiže za dva dana.' },
];

function renderComposer(quickReplies?: QuickReply[], recipientName = 'Milice') {
    const onSend = vi.fn();
    const view = renderOnPage(
        <Composer
            onSend={onSend}
            quickReplies={quickReplies && { items: quickReplies, manageHref: '/moji-proizvodjaci/7/brzi-odgovori', recipientName }}
        />,
    );

    return {
        ...view,
        onSend,
        box: screen.getByRole('textbox', { name: 'Poruka' }),
        send: screen.getByRole('button', { name: 'Pošalji poruku' }),
    };
}

/** Pick a saved answer; the composer writes it in on the next frame. */
async function pick(user: ReturnType<typeof renderComposer>['user'], title: string | RegExp) {
    await user.click(screen.getByRole('button', { name: 'Brzi odgovori' }));
    await user.click(screen.getByRole('menuitem', { name: title }));
    await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
}

describe('Composer', () => {
    describe('sending', () => {
        it('has nothing to send while the box is empty', () => {
            const { send } = renderComposer();

            expect(send).toBeDisabled();
        });

        it('sends what was typed with the button, and empties the box for the next message', async () => {
            const { user, box, send, onSend } = renderComposer();

            await user.type(box, 'Da li imate ajvar?');
            expect(send).toBeEnabled();

            await user.click(send);

            expect(onSend).toHaveBeenCalledExactlyOnceWith('Da li imate ajvar?');
            expect(box).toHaveValue('');
            expect(box).toHaveFocus();
            expect(send).toBeDisabled();
        });

        it('sends on Enter', async () => {
            const { user, box, onSend } = renderComposer();

            await user.type(box, 'Da li imate ajvar?{Enter}');

            expect(onSend).toHaveBeenCalledExactlyOnceWith('Da li imate ajvar?');
            expect(box).toHaveValue('');
        });

        it('starts a new line on Shift+Enter instead', async () => {
            const { user, box, onSend } = renderComposer();

            await user.type(box, 'Dobar dan,{Shift>}{Enter}{/Shift}da li imate ajvar?');

            expect(onSend).not.toHaveBeenCalled();
            expect(box).toHaveValue('Dobar dan,\nda li imate ajvar?');
        });

        it('does not send half a word while an input method is still composing it', async () => {
            const { user, box, onSend } = renderComposer();

            await user.type(box, 'Здраво');
            fireEvent.keyDown(box, { key: 'Enter', isComposing: true });

            expect(onSend).not.toHaveBeenCalled();
            expect(box).toHaveValue('Здраво');
        });

        it('trims the message and keeps the line breaks inside it', async () => {
            const { user, box, onSend } = renderComposer();

            await user.type(box, '  Prvi red{Shift>}{Enter}{/Shift}drugi red  {Enter}');

            expect(onSend).toHaveBeenCalledExactlyOnceWith('Prvi red\ndrugi red');
        });

        it('does not send a message of nothing but spaces', async () => {
            const { user, box, send, onSend } = renderComposer();

            await user.type(box, '   {Enter}');

            expect(onSend).not.toHaveBeenCalled();
            expect(send).toBeDisabled();
        });

        it('takes no more than two thousand characters', () => {
            const { box } = renderComposer();

            expect(box).toHaveAttribute('maxlength', '2000');
        });
    });

    describe('quick replies', () => {
        it("are not offered on the buyer's side", () => {
            renderComposer();

            expect(screen.queryByRole('button', { name: 'Brzi odgovori' })).not.toBeInTheDocument();
        });

        it("lists the producer's saved answers by title, with how each one starts", async () => {
            const { user } = renderComposer(REPLIES);

            await user.click(screen.getByRole('button', { name: 'Brzi odgovori' }));

            expect(screen.getByRole('menuitem', { name: /^Pozdrav/ })).toHaveTextContent('Dobar dan, {ime}! Hvala što ste se javili.');
            expect(screen.getByRole('menuitem', { name: /^Dostava/ })).toBeInTheDocument();
            expect(screen.getByRole('menuitem', { name: 'Uredi brze odgovore' })).toHaveAttribute('href', '/moji-proizvodjaci/7/brzi-odgovori');
        });

        it("writes the answer into the box with the buyer's name in place of {ime}", async () => {
            const { user, box } = renderComposer(REPLIES, 'Milice');

            await pick(user, /^Pozdrav/);

            expect(box).toHaveValue('Dobar dan, Milice! Hvala što ste se javili.');
            expect(box).toHaveFocus();
        });

        it('fills in every {ime} in an answer', async () => {
            const { user, box } = renderComposer([{ id: 3, title: 'Dva puta', body: '{ime}, hvala. Vidimo se, {ime}!' }], 'Petre');

            await pick(user, /^Dva puta/);

            expect(box).toHaveValue('Petre, hvala. Vidimo se, Petre!');
        });

        it('never sends it by itself: it is read over and sent like anything typed', async () => {
            const { user, box, send, onSend } = renderComposer(REPLIES);

            await pick(user, /^Dostava/);

            expect(onSend).not.toHaveBeenCalled();
            expect(visits()).toHaveLength(0);

            await user.type(box, ' Javite adresu.');
            await user.click(send);

            expect(onSend).toHaveBeenCalledExactlyOnceWith('Šaljemo kurirskom službom, stiže za dva dana. Javite adresu.');
        });

        it('adds it on a new line after what is already typed', async () => {
            const { user, box } = renderComposer(REPLIES);

            await user.type(box, 'Imamo, naravno.  ');
            await pick(user, /^Dostava/);

            expect(box).toHaveValue('Imamo, naravno.\nŠaljemo kurirskom službom, stiže za dva dana.');
        });

        it('adds a second answer under the first', async () => {
            const { user, box } = renderComposer(REPLIES);

            await pick(user, /^Pozdrav/);
            await pick(user, /^Dostava/);

            expect(box).toHaveValue('Dobar dan, Milice! Hvala što ste se javili.\nŠaljemo kurirskom službom, stiže za dva dana.');
        });

        it('cuts the text at the length a message may have', async () => {
            const { user, box } = renderComposer([{ id: 4, title: 'Dugačak', body: 'a'.repeat(2500) }]);

            await pick(user, /^Dugačak/);

            expect(box).toHaveValue('a'.repeat(2000));
        });

        it('explains what they are for and offers to add some, while there are none', async () => {
            const { user } = renderComposer([]);

            await user.click(screen.getByRole('button', { name: 'Brzi odgovori' }));

            expect(
                screen.getByText('Sačuvajte odgovore koje često šaljete — cene, dostavu, gde vas mogu naći — i ubacite ih jednim dodirom.'),
            ).toBeVisible();
            expect(screen.getByRole('menuitem', { name: 'Dodaj brze odgovore' })).toHaveAttribute('href', '/moji-proizvodjaci/7/brzi-odgovori');
            expect(screen.getAllByRole('menuitem')).toHaveLength(1);
        });
    });
});
