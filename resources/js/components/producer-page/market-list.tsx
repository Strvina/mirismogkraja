import { t } from '@/lib/i18n';
import { formatDays, todayWeekday } from '@/lib/weekdays';
import { type ProducerMarket } from '@/types';
import { CalendarDays, Clock, MapPin } from 'lucide-react';

/**
 * "Gde me nađete": the markets and stalls where the producer sells in
 * person. A place they are at today is marked, since that is the one a
 * visitor can still walk to.
 */
export default function MarketList({ markets }: { markets: ProducerMarket[] }) {
    if (markets.length === 0) {
        return null;
    }

    const today = todayWeekday();

    return (
        <section className="mt-12 max-w-2xl">
            <h2 className="font-serif text-2xl">{t('Gde me nađete')}</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {markets.map((market) => (
                    <li key={market.id} className="border-border/70 rounded-lg border p-4 text-sm">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="font-medium break-words">{market.name}</p>
                            {market.days.includes(today) && (
                                <span className="bg-olive-soft text-olive rounded-full px-2 py-0.5 text-xs font-medium">{t('Danas')}</span>
                            )}
                        </div>
                        {market.city && (
                            <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
                                <MapPin className="size-3.5 shrink-0" />
                                {market.city}
                            </p>
                        )}
                        <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
                            <CalendarDays className="size-3.5 shrink-0" />
                            {formatDays(market.days)}
                        </p>
                        {market.opens_at && market.closes_at && (
                            <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
                                <Clock className="size-3.5 shrink-0" />
                                {market.opens_at}–{market.closes_at}
                            </p>
                        )}
                        {market.note && <p className="text-muted-foreground mt-2 text-xs leading-5 break-words">{market.note}</p>}
                    </li>
                ))}
            </ul>
        </section>
    );
}
