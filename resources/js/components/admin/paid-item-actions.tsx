import InputError from '@/components/input-error';
import type { PaidKind, RefundState } from '@/components/marketplace/payment-status';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatDate, formatNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import { router, useForm } from '@inertiajs/react';
import { Banknote, Check, Power, X } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

/** What every admin row of something paid for by slip carries (CancellationService::adminFields). */
export interface PaidItemFields {
    id: number;
    status: string;
    amount_rsd: number;
    paid_kind: PaidKind;
    anchor: string;
    cancel_requested_at: string | null;
    refund_account: string | null;
    refund_suggestion: number | null;
    refund: RefundState | null;
}

/** The classes that make a row a notification points at stand out when opened. */
export const TARGET_ROW = 'scroll-mt-24 target:ring-2 target:ring-gold/60';

export function CancelRequestedBadge({ at }: { at: string | null | undefined }) {
    if (!at) {
        return null;
    }

    return (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
            {t('Traži otkazivanje · :date', { date: formatDate(at) })}
        </span>
    );
}

/**
 * Deactivating something running, with the refund decided in the same step:
 * the unused share is suggested, the admin can change it or set 0.
 */
function DeactivateDialog({
    item,
    what,
    open,
    onOpenChange,
}: {
    item: PaidItemFields;
    what: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { data, setData, patch, processing, errors } = useForm({ refund_rsd: item.refund_suggestion ?? 0 });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        patch(route('admin.paid.cancel', [item.paid_kind, item.id]), { preserveScroll: true, onSuccess: () => onOpenChange(false) });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>{t('Deaktivirati :what?', { what })}</DialogTitle>
                <DialogDescription>{t('Prestaje odmah i prelazi u otkazane; proizvođač dobija obaveštenje.')}</DialogDescription>

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-1.5">
                        <label htmlFor={`refund-${item.anchor}`} className="text-sm font-medium">
                            {t('Povraćaj novca (RSD)')}
                        </label>
                        <Input
                            id={`refund-${item.anchor}`}
                            type="number"
                            min={0}
                            max={item.amount_rsd}
                            value={data.refund_rsd}
                            onChange={(event) => setData('refund_rsd', Number(event.target.value))}
                        />
                        <p className="text-muted-foreground text-xs">
                            {t('Predlog je srazmeran neiskorišćenim danima: :suggested od uplaćenih :paid RSD. Unesite 0 ako nema povraćaja.', {
                                suggested: formatNumber(item.refund_suggestion ?? 0),
                                paid: formatNumber(item.amount_rsd),
                            })}
                        </p>
                        <InputError message={errors.refund_rsd} />
                    </div>

                    <p className="bg-muted/50 rounded-lg p-3 text-sm">
                        {item.refund_account
                            ? t('Proizvođač je dao račun: :account', { account: item.refund_account })
                            : t('Proizvođač još nije dao račun; obaveštenje će ga zamoliti da ga unese.')}
                    </p>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                            {t('Odustani')}
                        </Button>
                        <Button size="sm" variant="destructive" disabled={processing}>
                            <Power className="size-4" />
                            {t('Deaktiviraj')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/**
 * What an admin can do with something paid for by slip: confirm or cancel
 * an unpaid request, or deactivate a running one - flagged when the
 * producer asked for it.
 */
export default function PaidItemActions({
    item,
    what,
    onConfirm,
}: {
    item: PaidItemFields;
    /** Named in the deactivation dialog, e.g. "članarinu za Mlekara Zapis". */
    what: string;
    onConfirm?: () => void;
}) {
    const [deactivating, setDeactivating] = useState(false);
    const cancel = () => router.patch(route('admin.paid.cancel', [item.paid_kind, item.id]), {}, { preserveScroll: true });

    if (item.status === 'pending_payment') {
        return (
            <div className="flex shrink-0 flex-wrap gap-2">
                {onConfirm && (
                    <Button size="sm" onClick={onConfirm}>
                        <Check className="size-4" />
                        {t('Uplata primljena')}
                    </Button>
                )}
                <Button variant="outline" size="sm" onClick={cancel}>
                    <X className="size-4" />
                    {t('Otkaži')}
                </Button>
            </div>
        );
    }

    if (item.status === 'active') {
        return (
            <>
                <Button variant="outline" size="sm" className="text-destructive shrink-0" onClick={() => setDeactivating(true)}>
                    <Power className="size-4" />
                    {t('Deaktiviraj')}
                </Button>
                {deactivating && <DeactivateDialog item={item} what={what} open onOpenChange={setDeactivating} />}
            </>
        );
    }

    return null;
}

/** A decided refund on an admin row: where it goes, and marking it sent. */
export function RefundLine({ item }: { item: PaidItemFields }) {
    const refund = item.refund;

    if (!refund) {
        return null;
    }

    const amount = `${formatNumber(refund.amount)} RSD`;

    if (refund.refunded_at) {
        return (
            <p className="text-olive mt-2 flex items-center gap-2 text-sm">
                <Banknote className="size-4" aria-hidden />
                {t('Vraćeno :amount, :date.', { amount, date: formatDate(refund.refunded_at) })}
            </p>
        );
    }

    return (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
            <p className="flex items-center gap-2">
                <Banknote className="size-4 shrink-0" aria-hidden />
                {refund.account
                    ? t('Za povraćaj: :amount na račun :account', { amount, account: refund.account })
                    : t('Za povraćaj: :amount — čeka se broj računa od proizvođača', { amount })}
            </p>
            <Button
                size="sm"
                variant="outline"
                disabled={!refund.account}
                onClick={() => router.patch(route('admin.refunds.paid', [item.paid_kind, item.id]), {}, { preserveScroll: true })}
            >
                <Check className="size-4" />
                {t('Novac je vraćen')}
            </Button>
        </div>
    );
}
