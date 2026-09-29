import { t } from '@/lib/i18n';
import { ChevronDown } from 'lucide-react';
import { type ReactNode } from 'react';

export function Saved({ show }: { show: boolean }) {
    return show ? <span className="text-olive text-sm">{t('Sačuvano')}</span> : null;
}

/**
 * One group of settings that folds away: the title and a one-line summary
 * when closed, the form when open. A native <details>, so it needs no state
 * and opens from the keyboard.
 */
export default function SettingsPanel({
    title,
    summary,
    lead,
    defaultOpen = false,
    children,
}: {
    title: string;
    /** Shown beside the title, e.g. the current price. */
    summary?: ReactNode;
    /** What this setting does, shown when open. */
    lead?: string;
    defaultOpen?: boolean;
    children: ReactNode;
}) {
    return (
        <details open={defaultOpen} className="group border-border/70 bg-background rounded-xl border">
            <summary className="hover:bg-muted/40 flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                    <span className="block font-medium">{title}</span>
                    {summary && <span className="text-muted-foreground block text-sm">{summary}</span>}
                </span>
                <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-border/70 border-t p-4">
                {lead && <p className="text-muted-foreground mb-4 max-w-2xl text-sm">{lead}</p>}
                {children}
            </div>
        </details>
    );
}
