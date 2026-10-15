import { setMediaQuery } from '@/__tests__/support/browser';
import { lastVisit, visits } from '@/__tests__/support/inertia';
import { createUser, renderOnPage } from '@/__tests__/support/render';
import ReportButton from '@/components/marketplace/report-button';
import { sendOnEnter } from '@/lib/send-on-enter';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const COARSE = '(pointer: coarse)';

function Box({ send }: { send: () => void }) {
    return <textarea aria-label="Poruka" onKeyDown={sendOnEnter(send)} />;
}

describe('sendOnEnter', () => {
    it('sends on Enter and starts a new line on Shift+Enter', async () => {
        const send = vi.fn();
        const user = createUser();
        render(<Box send={send} />);

        await user.type(screen.getByLabelText('Poruka'), 'Imate li med?{Shift>}{Enter}{/Shift}I sir?');
        expect(send).not.toHaveBeenCalled();
        expect(screen.getByLabelText('Poruka')).toHaveValue('Imate li med?\nI sir?');

        await user.type(screen.getByLabelText('Poruka'), '{Enter}');
        expect(send).toHaveBeenCalledOnce();
    });

    it('leaves Enter a new line on a phone, where there is no Shift+Enter', async () => {
        setMediaQuery(COARSE, true);
        const send = vi.fn();
        const user = createUser();
        render(<Box send={send} />);

        await user.type(screen.getByLabelText('Poruka'), 'Imate li med?{Enter}');

        expect(send).not.toHaveBeenCalled();
        expect(screen.getByLabelText('Poruka')).toHaveValue('Imate li med?\n');
    });

    it('submits the form the box is in when given nothing to call', async () => {
        const { user } = renderOnPage(<ReportButton type="product" id={7} reasons={{ spam: 'Spam' }} />);
        await user.click(screen.getByRole('button', { name: 'Prijavi problem' }));

        await user.type(screen.getByLabelText('Možete dodati detalje (nije obavezno)'), 'Lažna ponuda{Enter}');

        expect(visits()).toHaveLength(1);
        expect(lastVisit().data).toMatchObject({ reportable_type: 'product', reportable_id: 7, message: 'Lažna ponuda' });
    });
});
