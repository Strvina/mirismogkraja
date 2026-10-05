import { formatNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { type ReactNode } from 'react';

export interface Plan {
    id: number;
    name: string;
    description: string | null;
    price_rsd: number;
    features: string[] | null;
    level: number;
}

/**
 * One membership plan: name, yearly price and what it unlocks. Shared by the
 * public price list and the producer's own membership page, so a plan reads
 * the same before and after signing up; whatever the page lets the reader do
 * with it goes in as children.
 */
export default function PlanCard({
    plan,
    featureLabels,
    highlighted = false,
    children,
}: {
    plan: Plan;
    featureLabels: Record<string, string>;
    highlighted?: boolean;
    children?: ReactNode;
}) {
    return (
        <article className={cn('flex flex-col rounded-lg border p-5', highlighted ? 'border-olive bg-olive-soft/30' : 'border-border/70')}>
            <h2 className="font-serif text-2xl">{plan.name}</h2>
            <p className="mt-1 font-serif text-3xl">
                {formatNumber(plan.price_rsd)} <span className="text-muted-foreground font-sans text-sm">{t('RSD / god')}</span>
            </p>

            {plan.description && <p className="text-muted-foreground mt-3 text-sm leading-6">{t(plan.description)}</p>}

            {plan.features && plan.features.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm">
                    {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                            <Check className="text-olive mt-0.5 size-4 shrink-0" />
                            {featureLabels[feature] ?? feature}
                        </li>
                    ))}
                </ul>
            )}

            {children && <div className="mt-auto pt-5">{children}</div>}
        </article>
    );
}
