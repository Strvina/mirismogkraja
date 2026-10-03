import InfoHint from '@/components/info-hint';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Check } from 'lucide-react';

/**
 * The producer's own note on how the inquiry ended. Optional, invisible to
 * the buyer, and explained right where it is. Clicking the chosen one again
 * clears it.
 */
export default function OutcomeBar({
    producerId,
    buyerId,
    outcome,
    labels,
}: {
    producerId: number;
    buyerId: number;
    outcome: string | null;
    labels: Record<string, string>;
}) {
    return (
        <div className="border-border/70 bg-muted/30 flex flex-wrap items-center gap-2 border-b px-4 py-2 text-xs">
            <span className="text-muted-foreground flex items-center gap-1 font-medium">
                {t('Ishod upita')}
                <InfoHint label={t('Šta je ishod upita?')} title={t('Ishod upita — samo za evidenciju')}>
                    <p>
                        {t(
                            'Ovde možete, ako želite, da označite kako se razgovor završio: da ste se čuli sa kupcem, da je kupovina realizovana, ili da je otkazana.',
                        )}
                    </p>
                    <p>{t('Nije obavezno i ne utiče ni na šta — ni na vaš profil, ni na ocene, ni na cenu. Kupac ovo ne vidi.')}</p>
                    <p>
                        {t(
                            'Plaćanje i dostavu dogovarate direktno sa kupcem, pa sajt ne može da zna da li je nešto prodato. Vaša oznaka nam pomaže da vidimo koliko se preko sajta zaista proda i šta se najviše traži.',
                        )}
                    </p>
                </InfoHint>
            </span>
            {Object.entries(labels).map(([value, label]) => {
                const active = outcome === value;

                return (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                            router.patch(
                                route('messages.outcome', [producerId, buyerId]),
                                { status: active ? null : value },
                                { preserveScroll: true, only: ['outcome'] },
                            )
                        }
                        className={cn(
                            'rounded-full border px-2.5 py-1 transition-colors',
                            active ? 'border-olive bg-olive-soft text-olive font-semibold' : 'border-border/70 hover:bg-muted',
                        )}
                    >
                        {active && <Check className="mr-1 inline size-3" aria-hidden />}
                        {label}
                    </button>
                );
            })}
        </div>
    );
}
