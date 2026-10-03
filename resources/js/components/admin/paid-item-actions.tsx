import type { PaidKind } from '@/components/marketplace/payment-status';
import { Button } from '@/components/ui/button';
import { ask } from '@/lib/confirm';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Check, Power, X } from 'lucide-react';
import { type ReactNode } from 'react';

/** What every admin row of something paid for by slip carries (CancellationService::adminFields). */
export interface PaidItemFields {
    id: number;
    status: string;
    amount_rsd: number;
    paid_kind: PaidKind;
    anchor: string;
}

/** The classes that make a row a notification points at stand out when opened. */
export const TARGET_ROW = 'scroll-mt-24 target:ring-2 target:ring-gold/60';

/**
 * What an admin can do with something paid for by slip: confirm or cancel
 * an unpaid request, or deactivate a running one.
 */
export default function PaidItemActions({
    item,
    what,
    onConfirm,
}: {
    item: PaidItemFields;
    /** Named in the deactivation question, e.g. "članarinu za Mlekara Zapis". */
    what: string;
    onConfirm?: () => void;
}) {
    const cancel = () => router.patch(route('admin.paid.cancel', [item.paid_kind, item.id]), {}, { preserveScroll: true });

    const deactivate = async () => {
        if (
            await ask({
                title: t('Deaktivirati :what?', { what }),
                description: t('Prestaje odmah i prelazi u otkazane; proizvođač dobija obaveštenje. Ako mu dugujete novac, dogovorite se direktno.'),
                tone: 'danger',
            })
        ) {
            cancel();
        }
    };

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
            <Button variant="outline" size="sm" className="text-destructive shrink-0" onClick={deactivate}>
                <Power className="size-4" />
                {t('Deaktiviraj')}
            </Button>
        );
    }

    return null;
}

/**
 * One row of a paid-items queue, the same on every admin page: what it is
 * and its facts on the left, the actions on the right. A grid, not a
 * wrapping flex row, so a long name can never run under the buttons.
 */
export function PaidItemRow({
    item,
    title,
    subtitle,
    facts,
    actions,
}: {
    item: PaidItemFields;
    title: ReactNode;
    subtitle?: ReactNode;
    /** Short facts, shown as a row of separate items. */
    facts: ReactNode[];
    actions?: ReactNode;
}) {
    return (
        <div id={item.anchor} className={cn('bg-background rounded-xl border p-4', TARGET_ROW)}>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
                <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium break-words">{title}</p>
                    {subtitle && <p className="text-muted-foreground mt-0.5 text-sm break-words">{subtitle}</p>}
                    <ul className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        {facts.map((fact, index) => (
                            <li key={index}>{fact}</li>
                        ))}
                    </ul>
                </div>
                {actions && <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>}
            </div>
        </div>
    );
}
