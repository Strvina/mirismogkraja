import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CirclePause } from 'lucide-react';
import { type ReactNode } from 'react';

/** What a visitor is told about a producer's pause. */
export interface Pause {
    /** The day the producer said they would be back, if they said. */
    until: string | null;
    note: string | null;
}

/**
 * Shown in place of the invitation to write while a producer is sold out or
 * away. It says when they are back, if they said, and whatever the page
 * offers instead - following, so the visitor hears about the return - goes
 * in as children.
 */
export default function PauseNotice({ pause, children, className }: { pause: Pause; children?: ReactNode; className?: string }) {
    return (
        <div className={cn('border-gold/50 bg-cream-deep rounded-lg border p-4 text-sm leading-6', className)}>
            <p className="flex items-start gap-2 font-medium">
                <CirclePause className="text-gold mt-0.5 size-4 shrink-0" aria-hidden />
                {pause.until
                    ? t('Trenutno ne prima nove upite, do :date.', { date: formatDate(pause.until, { day: 'numeric', month: 'long' }) })
                    : t('Trenutno ne prima nove upite.')}
            </p>
            {pause.note && <p className="text-muted-foreground mt-1 break-words">{pause.note}</p>}
            {children && <div className="mt-3">{children}</div>}
        </div>
    );
}
