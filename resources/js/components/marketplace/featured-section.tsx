import InfoHint from '@/components/info-hint';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { type ReactNode } from 'react';

/**
 * The paid "Istaknuto" row above a listing, set apart so nobody mistakes it
 * for the listing itself: its own tinted panel, a heading with an
 * explanation of what it is, and a labelled rule between it and the
 * ordinary results that follow.
 */
export default function FeaturedSection({
    title,
    explanation,
    listLabel,
    children,
    className = 'mt-10',
}: {
    title: string;
    /** What earns a place here - shown behind the "?". */
    explanation: ReactNode;
    /** What the divider under the panel calls the ordinary list. */
    listLabel: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <>
            <section aria-label={title} className={cn('border-gold/40 bg-gold/5 rounded-2xl border p-4 sm:p-6', className)}>
                <div className="mb-4 flex items-center gap-2">
                    <Sparkles className="text-gold size-4" aria-hidden />
                    <h2 className="text-xs font-semibold tracking-[0.16em] uppercase">{title}</h2>
                    <InfoHint label={t('Šta znači „:title”?', { title })} title={title}>
                        {explanation}
                    </InfoHint>
                </div>
                {children}
            </section>

            <div className="mt-8 mb-6 flex items-center gap-4" role="separator" aria-label={listLabel}>
                <span className="bg-border h-px flex-1" />
                <span className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">{listLabel}</span>
                <span className="bg-border h-px flex-1" />
            </div>
        </>
    );
}
