import { answer, ask, current, subscribe } from '@/lib/confirm';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('ask', () => {
    afterEach(() => answer(false));

    it('holds the question open until it is answered', async () => {
        const settled = vi.fn();
        const question = ask({ title: 'Obrisati sliku?' }).then(settled);

        await Promise.resolve();
        expect(settled).not.toHaveBeenCalled();
        expect(current()).toMatchObject({ title: 'Obrisati sliku?' });

        answer(true);
        await question;

        expect(settled).toHaveBeenCalledWith(true);
    });

    it('resolves with a yes or a no, and closes the question either way', async () => {
        const yes = ask({ title: 'Prvo pitanje' });
        answer(true);

        expect(await yes).toBe(true);
        expect(current()).toBeNull();

        const no = ask({ title: 'Drugo pitanje' });
        answer(false);

        expect(await no).toBe(false);
        expect(current()).toBeNull();
    });

    it('keeps the words and the tone it was asked with', () => {
        ask({ title: 'Obrisati oglas?', description: 'Ne može se vratiti.', confirmLabel: 'Da, obriši', tone: 'danger' });

        expect(current()).toMatchObject({
            title: 'Obrisati oglas?',
            description: 'Ne može se vratiti.',
            confirmLabel: 'Da, obriši',
            tone: 'danger',
        });
    });

    it('answers a question still open with "no" when another one is asked', async () => {
        const first = ask({ title: 'Prvo pitanje' });
        const second = ask({ title: 'Drugo pitanje' });

        expect(await first).toBe(false);
        expect(current()).toMatchObject({ title: 'Drugo pitanje' });

        answer(true);
        expect(await second).toBe(true);
    });

    it('does nothing when an answer arrives with no question open', () => {
        expect(() => answer(true)).not.toThrow();
        expect(current()).toBeNull();
    });

    it('tells whoever shows the dialog when a question opens and when it closes', () => {
        const listener = vi.fn();
        const unsubscribe = subscribe(listener);

        ask({ title: 'Pitanje' });
        expect(listener).toHaveBeenCalledTimes(1);

        answer(true);
        expect(listener).toHaveBeenCalledTimes(2);

        unsubscribe();
        ask({ title: 'Još jedno' });
        expect(listener).toHaveBeenCalledTimes(2);
    });
});
