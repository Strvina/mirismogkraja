import { formatRelativeTime } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { MapPin, MessagesSquare } from 'lucide-react';

/** What a list shows of a "Tražim" ad. */
export interface WantedAdSummary {
    id: number;
    title: string;
    excerpt: string;
    quantity: string | null;
    city: string | null;
    category: string | null;
    /** First name only. */
    author: string;
    created_at: string;
    responses_count: number;
}

/** Where an ad stands, as its author sees it. */
export type WantedAdState = 'open' | 'expired' | 'closed' | 'blocked';

export const WANTED_STATE_LABELS: Record<WantedAdState, string> = {
    open: tx('Otvoren'),
    expired: tx('Istekao'),
    closed: tx('Zatvoren'),
    blocked: tx('Sklonjen'),
};

/** Category, quantity and place in one line; whatever the buyer filled in. */
export function WantedAdFacts({ ad, className }: { ad: Pick<WantedAdSummary, 'category' | 'quantity' | 'city'>; className?: string }) {
    if (!ad.category && !ad.quantity && !ad.city) {
        return null;
    }

    return (
        <p className={cn('text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs', className)}>
            {ad.category && <span className="text-primary font-semibold tracking-[0.08em] uppercase">{t(ad.category)}</span>}
            {ad.quantity && <span>{ad.quantity}</span>}
            {ad.city && (
                <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {ad.city}
                </span>
            )}
        </p>
    );
}

/** One ad in the public list: what is wanted, where, and how many have answered. */
export default function WantedAdCard({ ad, state }: { ad: WantedAdSummary; state?: WantedAdState }) {
    return (
        <Link
            href={route('wanted.show', ad.id)}
            className="group border-border/70 hover:border-border bg-background flex h-full flex-col rounded-lg border p-5 transition-shadow duration-300 hover:shadow-lg"
        >
            <WantedAdFacts ad={ad} />
            <h3 className="mt-2 font-serif text-xl leading-snug break-words">{ad.title}</h3>
            <p className="text-muted-foreground mt-2 line-clamp-3 text-sm leading-6 break-words">{ad.excerpt}</p>

            <p className="text-muted-foreground mt-auto flex flex-wrap items-center justify-between gap-2 pt-4 text-xs">
                <span>
                    {state && state !== 'open' ? <span className="text-foreground font-medium">{t(WANTED_STATE_LABELS[state])}</span> : ad.author} ·{' '}
                    {formatRelativeTime(ad.created_at)}
                </span>
                <span className="flex items-center gap-1">
                    <MessagesSquare className="size-3.5" />
                    {t('Odgovora: :count', { count: ad.responses_count })}
                </span>
            </p>
        </Link>
    );
}
