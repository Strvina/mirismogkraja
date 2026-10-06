import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';

/** What a Premium or Pro membership shows next to a producer's name. */
export function PremiumBadge({ className }: { className?: string }) {
    return (
        <span
            title={t('Proizvođač sa Premium članstvom')}
            className={cn(
                // Gold for the rule and the crown only: as small text on the
                // page's cream it is too faint to read.
                'border-gold/50 text-foreground/80 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-sans text-[0.68rem] font-semibold tracking-[0.06em] uppercase',
                className,
            )}
        >
            <Crown className="text-gold size-3" aria-hidden />
            Premium
        </span>
    );
}

/**
 * Marks a paid placement. Every paid slot carries it, so a visitor can
 * always tell what was paid for from what was earned - the reason paid
 * producers get their own row instead of being moved up the list.
 */
export function FeaturedLabel({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                'bg-charcoal/85 text-primary-foreground rounded-full px-3 py-1 text-[0.65rem] font-semibold tracking-[0.1em] uppercase backdrop-blur',
                className,
            )}
        >
            {t('Istaknuto')}
        </span>
    );
}
