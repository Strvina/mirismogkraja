import { t, tx } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

export type PaymentStatus = 'pending_payment' | 'active' | 'expired' | 'cancelled';

/** The URL name of each thing paid for by slip (App\Support\PaidItems). */
export type PaidKind = 'clanarina' | 'isticanje' | 'kampanja';

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
