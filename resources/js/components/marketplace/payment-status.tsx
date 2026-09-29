import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { type LucideIcon } from 'lucide-react';

export type PaymentStatus = 'pending_payment' | 'active' | 'expired' | 'cancelled';

const STYLES: Record<PaymentStatus, { label: string; className: string }> = {
    pending_payment: { label: 'Čeka uplatu', className: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100' },
    active: { label: 'Aktivno', className: 'bg-olive-soft text-olive' },
    expired: { label: 'Isteklo', className: 'bg-muted text-muted-foreground' },
    cancelled: { label: 'Otkazano', className: 'bg-destructive/10 text-destructive' },
};

/** Where something paid for by slip stands, in the same colours everywhere. */
export function PaymentStatusBadge({ status, label }: { status: PaymentStatus; label?: string }) {
    const style = STYLES[status];

    return <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', style.className)}>{label ?? style.label}</span>;
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
                            Korak {index + 1}
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
 * Asking for something running to be stopped. It only sends the request -
 * an admin decides, and a refund, if any, is agreed with us directly - so
 * once sent it just says so.
 */
export function CancelRequest({ href, requestedAt, what }: { href: string; requestedAt: string | null; what: string }) {
    if (requestedAt) {
        return <span className="text-muted-foreground text-xs">Otkazivanje zatraženo {new Date(requestedAt).toLocaleDateString('sr-RS')}</span>;
    }

    return (
        <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
            onClick={() => {
                if (confirm(`Zatražiti otkazivanje za ${what}? Zahtev stiže nama; javićemo vam se pre nego što ga otkažemo.`)) {
                    router.post(href, {}, { preserveScroll: true });
                }
            }}
        >
            Zatraži otkazivanje
        </button>
    );
}
