import { Button } from '@/components/ui/button';
import { Check, Power, X } from 'lucide-react';

/**
 * What an admin can do with something paid for by slip: confirm or cancel
 * an unpaid request, or deactivate a running one - flagged when the
 * producer asked for it.
 */
export function CancelRequestedBadge({ at }: { at: string | null | undefined }) {
    if (!at) {
        return null;
    }

    return (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
            Traži otkazivanje · {new Date(at).toLocaleDateString('sr-RS')}
        </span>
    );
}

export default function PaidItemActions({
    status,
    what,
    onConfirm,
    onCancel,
}: {
    status: string;
    /** Named in the deactivation question, e.g. "članarinu za Mlekara Zapis". */
    what: string;
    onConfirm?: () => void;
    onCancel: () => void;
}) {
    if (status === 'pending_payment') {
        return (
            <div className="flex shrink-0 flex-wrap gap-2">
                {onConfirm && (
                    <Button size="sm" onClick={onConfirm}>
                        <Check className="size-4" />
                        Uplata primljena
                    </Button>
                )}
                <Button variant="outline" size="sm" onClick={onCancel}>
                    <X className="size-4" />
                    Otkaži
                </Button>
            </div>
        );
    }

    if (status === 'active') {
        return (
            <Button
                variant="outline"
                size="sm"
                className="text-destructive shrink-0"
                onClick={() => {
                    if (
                        confirm(
                            `Deaktivirati ${what}? Prestaje odmah i prelazi u otkazane; proizvođač dobija obaveštenje. Povraćaj novca, ako ga dogovorite, radite van sajta.`,
                        )
                    ) {
                        onCancel();
                    }
                }}
            >
                <Power className="size-4" />
                Deaktiviraj
            </Button>
        );
    }

    return null;
}
