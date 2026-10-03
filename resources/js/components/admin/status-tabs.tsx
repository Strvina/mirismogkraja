import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { Settings2 } from 'lucide-react';

export interface StatusTab {
    status: string;
    label: string;
}

/**
 * The tabs of a paid-items queue: the settings that shape it on the far
 * left (prices, plans, campaigns), then the items by status. Each tab is its
 * own visit, so the server loads only what the open tab shows.
 */
export default function StatusTabs({
    routeName,
    current,
    settingsLabel,
    tabs,
    counts,
}: {
    routeName: string;
    current: string;
    settingsLabel: string;
    tabs: StatusTab[];
    /** How many items each tab holds. */
    counts: Record<string, number>;
}) {
    const tabClass = (active: boolean) =>
        cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
            active ? 'bg-olive-soft text-olive' : 'text-muted-foreground hover:bg-muted',
        );

    return (
        <nav aria-label={t('Kartice')} className="border-border/70 -mx-1 flex items-center gap-1 overflow-x-auto border-b px-1 pb-3">
            <Link href={route(routeName, { status: 'settings' })} preserveScroll className={tabClass(current === 'settings')}>
                <Settings2 className="size-4" aria-hidden />
                {t(settingsLabel)}
            </Link>

            <span className="bg-border mx-2 h-6 w-px shrink-0" aria-hidden />

            {tabs.map((tab) => {
                const urgent = tab.status === 'pending_payment' && counts.pending_payment > 0;

                return (
                    <Link
                        key={tab.status}
                        href={route(routeName, { status: tab.status })}
                        preserveScroll
                        className={tabClass(current === tab.status)}
                    >
                        {t(tab.label)}
                        <span
                            className={cn(
                                'rounded-full px-1.5 py-0.5 text-[0.65rem] tabular-nums',
                                urgent ? 'bg-gold text-foreground' : 'bg-muted text-muted-foreground',
                            )}
                        >
                            {counts[tab.status] ?? 0}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
