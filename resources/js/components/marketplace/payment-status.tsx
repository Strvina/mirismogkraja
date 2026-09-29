import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatDate, formatNumber } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import { Banknote, type LucideIcon } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

export type PaymentStatus = 'pending_payment' | 'active' | 'expired' | 'cancelled';

/** The URL name of each thing paid for by slip (App\Support\PaidItems). */
export type PaidKind = 'clanarina' | 'isticanje' | 'kampanja';

export interface RefundState {
    amount: number;
    account: string | null;
    refunded_at: string | null;
}

const STYLES: Record<PaymentStatus, { label: string; className: string }> = {
    pending_payment: { label: tx('Čeka uplatu'), className: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100' },
    active: { label: tx('Aktivno'), className: 'bg-olive-soft text-olive' },
    expired: { label: tx('Isteklo'), className: 'bg-muted text-muted-foreground' },
    cancelled: { label: tx('Otkazano'), className: 'bg-destructive/10 text-destructive' },
};

/** Where something paid for by slip stands, in the same colours everywhere. */
export function PaymentStatusBadge({ status, label }: { status: PaymentStatus; label?: string }) {
    const style = STYLES[status];

    return (
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', style.className)}>{label ?? t(style.label)}</span>
    );
}

/**
 * The three steps of anything paid by slip, said up front - choosing is not
 * paying, and paying is not the same moment as it starting.
 */
export function HowItWorks({ steps }: { steps: { icon: LucideIcon; title: string; text: string }[] }) {
    return (
        <ol className="grid gap-3 sm:grid-cols-3">
            {steps.map((step, index) => (
                <li key={step.title} className="border-border/70 bg-background flex gap-3 rounded-lg border p-4">
                    <span className="bg-olive-soft text-olive grid size-9 shrink-0 place-items-center rounded-full">
                        <step.icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                        <span className="text-muted-foreground block text-[0.65rem] font-semibold tracking-[0.14em] uppercase">
                            {t('Korak :number', { number: index + 1 })}
                        </span>
                        <span className="block font-medium">{step.title}</span>
                        <span className="text-muted-foreground mt-0.5 block text-sm leading-6">{step.text}</span>
                    </span>
                </li>
            ))}
        </ol>
    );
}

/**
 * The id of the row a notification pointed at (?uplatnica=12), read once on
 * the first render: a link from a notification opens that slip right away.
 */
export function linkedSlipId(): number | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const id = Number(new URLSearchParams(window.location.search).get('uplatnica'));

    return Number.isInteger(id) && id > 0 ? id : null;
}

/** A bank account field, shared by the cancel request and the refund. */
function AccountField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
    return (
        <div className="grid gap-1.5">
            <label htmlFor="refund-account" className="text-sm font-medium">
                {t('Broj računa za povraćaj')}
            </label>
            <Input
                id="refund-account"
                inputMode="numeric"
                placeholder="160-0000000000000-00"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
            <InputError message={error} />
        </div>
    );
}

/**
 * Asking for something running to be stopped. It only sends the request -
 * an admin decides, and returns the unused part by bank transfer - so the
 * dialog says how refunds work and takes the account up front.
 */
export function CancelRequest({ kind, id, requestedAt, what }: { kind: PaidKind; id: number; requestedAt: string | null; what: string }) {
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, errors } = useForm({ refund_account: '' });

    if (requestedAt) {
        return <span className="text-muted-foreground text-xs">{t('Otkazivanje zatraženo :date', { date: formatDate(requestedAt) })}</span>;
    }

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post(route('cancellation.request', [kind, id]), { preserveScroll: true, onSuccess: () => setOpen(false) });
    };

    return (
        <>
            <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
                onClick={() => setOpen(true)}
            >
                {t('Zatraži otkazivanje')}
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogTitle>{t('Otkazivanje: :what', { what })}</DialogTitle>
                    <DialogDescription>
                        {t('Zahtev stiže nama; javićemo vam se pre nego što ga otkažemo. Do tada sve radi kao i do sada.')}
                    </DialogDescription>

                    <div className="bg-muted/50 space-y-2 rounded-lg p-4 text-sm leading-6">
                        <p className="flex items-center gap-2 font-medium">
                            <Banknote className="text-olive size-4" aria-hidden />
                            {t('Kako se vraća novac')}
                        </p>
                        <p className="text-muted-foreground">
                            {t(
                                'Za dane koji su ostali neiskorišćeni vraćamo srazmeran deo uplate, uplatom na vaš račun. Iznos vam javljamo kada otkažemo.',
                            )}
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <AccountField
                            value={data.refund_account}
                            onChange={(value) => setData('refund_account', value)}
                            error={errors.refund_account}
                        />
                        <p className="text-muted-foreground -mt-2 text-xs">{t('Nije obavezno — račun možete uneti i kasnije.')}</p>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                                {t('Odustani')}
                            </Button>
                            <Button size="sm" disabled={processing}>
                                {t('Pošalji zahtev')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

/**
 * Money coming back on something cancelled: how much, where to, and
 * whether it has left - with a place to give the account if we lack it.
 */
export function RefundStatus({ kind, id, refund }: { kind: PaidKind; id: number; refund: RefundState | null }) {
    const { data, setData, put, processing, errors } = useForm({ refund_account: '' });

    if (!refund) {
        return null;
    }

    const amount = `${formatNumber(refund.amount)} RSD`;

    if (refund.refunded_at) {
        return (
            <p className="bg-olive-soft text-olive mt-3 rounded-lg px-3 py-2 text-sm">
                {t('Vraćeno :amount na račun :account, :date.', { amount, account: refund.account, date: formatDate(refund.refunded_at) })}
            </p>
        );
    }

    if (refund.account) {
        return (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
                {t('Vraćamo vam :amount na račun :account. Javićemo vam kada ga uplatimo.', { amount, account: refund.account })}
            </p>
        );
    }

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        put(route('refunds.account', [kind, id]), { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="mt-3 space-y-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
            <p>{t('Vraćamo vam :amount. Unesite broj računa na koji da uplatimo novac.', { amount })}</p>
            <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-56 flex-1">
                    <AccountField value={data.refund_account} onChange={(value) => setData('refund_account', value)} error={errors.refund_account} />
                </div>
                <Button size="sm" disabled={processing}>
                    {t('Sačuvaj')}
                </Button>
            </div>
        </form>
    );
}
