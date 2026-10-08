import { lastVisit, visits } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import ReportButton from '@/components/marketplace/report-button';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const REASONS = { scam: 'Prevara ili lažno predstavljanje', no_reply: 'Ne odgovara na poruke', other: 'Nešto drugo' };

async function openForm(props: Partial<Parameters<typeof ReportButton>[0]> = {}) {
    const view = renderOnPage(<ReportButton type="producer" id={4} reasons={REASONS} {...props} />);

    await view.user.click(screen.getByRole('button', { name: props.label ?? 'Prijavi problem' }));

    const dialog = screen.getByRole('dialog');

    return {
        ...view,
        dialog,
        reason: within(dialog).getByLabelText('Šta se desilo?'),
        details: within(dialog).getByLabelText('Možete dodati detalje (nije obavezno)'),
        send: within(dialog).getByRole('button', { name: 'Pošalji prijavu' }),
    };
}

describe('ReportButton', () => {
    it('is a quiet button until pressed', () => {
        renderOnPage(<ReportButton type="producer" id={4} reasons={REASONS} />);

        expect(screen.getByRole('button', { name: 'Prijavi problem' })).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it("can be called something else where 'problem' is the wrong word", () => {
        renderOnPage(<ReportButton type="post" id={4} reasons={REASONS} label="Prijavi" />);

        expect(screen.getByRole('button', { name: 'Prijavi' })).toBeInTheDocument();
    });

    it('opens a form that says who will read the report', async () => {
        const { dialog } = await openForm();

        expect(dialog).toHaveAccessibleName('Prijavi problem');
        expect(dialog).toHaveAccessibleDescription('Prijava ide našem timu, a ne proizvođaču. Nećemo je javno objaviti.');
    });

    it('offers the fixed list of reasons, the first one chosen', async () => {
        const { reason } = await openForm();

        expect(
            within(reason)
                .getAllByRole('option')
                .map((option) => option.textContent),
        ).toEqual(Object.values(REASONS));
        expect(reason).toHaveValue('scam');
    });

    it('can be sent as it is: the details are optional', async () => {
        const { user, send } = await openForm({ type: 'product', id: 31 });

        await user.click(send);

        expect(lastVisit()).toMatchObject({
            method: 'post',
            url: route('reports.store'),
            data: { reportable_type: 'product', reportable_id: 31, reason: 'scam', message: '' },
            options: { preserveScroll: true },
        });
    });

    it('sends the chosen reason and what was written', async () => {
        const { user, reason, details, send } = await openForm({ type: 'user', id: 8 });

        await user.selectOptions(reason, 'Ne odgovara na poruke');
        await user.type(details, 'Pisao sam tri puta.');
        await user.click(send);

        expect(lastVisit()).toMatchObject({
            data: { reportable_type: 'user', reportable_id: 8, reason: 'no_reply', message: 'Pisao sam tri puta.' },
        });
    });

    it('cannot be sent twice while the first is on its way', async () => {
        const { user, send } = await openForm();

        await user.click(send);

        expect(send).toBeDisabled();
        expect(visits()).toHaveLength(1);
    });

    it('closes once the report is in, and starts empty the next time', async () => {
        const { user, details, send } = await openForm();

        await user.type(details, 'Pisao sam tri puta.');
        await user.click(send);
        lastVisit().succeed();

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Prijavi problem' }));

        expect(screen.getByLabelText('Možete dodati detalje (nije obavezno)')).toHaveValue('');
        expect(screen.getByRole('button', { name: 'Pošalji prijavu' })).toBeEnabled();
    });

    it('stays open with what was written when the server refuses it', async () => {
        const { user, details, send } = await openForm();

        await user.type(details, 'Pisao sam tri puta.');
        await user.click(send);
        lastVisit().fail({ reason: 'Previše prijava. Pokušajte kasnije.' });

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(details).toHaveValue('Pisao sam tri puta.');
        expect(send).toBeEnabled();
    });

    it('closes without sending anything on "Odustani"', async () => {
        const { user, dialog } = await openForm();

        await user.click(within(dialog).getByRole('button', { name: 'Odustani' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(visits()).toHaveLength(0);
    });

    it('has nothing chosen when there are no reasons to choose from', async () => {
        const { user, send } = await openForm({ reasons: {} });

        await user.click(send);

        expect(lastVisit()).toMatchObject({ data: { reason: '' } });
    });
});
