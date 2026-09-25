import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Članarina', href: '/clanarina' }];

interface Plan {
    id: number;
    name: string;
    description: string | null;
    price_rsd: number;
    duration_days: number;
    features: string[] | null;
    level: number;
}

interface ProducerMembership {
    id: number;
    name: string;
    status: string;
    current_plan: { id: number; name: string; level: number } | null;
    active: { id: number; ends_at: string } | null;
    pending: { id: number; reference: string; amount_rsd: number; created_at: string } | null;
}

const dinars = new Intl.NumberFormat('sr-RS');

/**
 * Memberships from the producer's side (task 20.1).
 *
 * Payment is by bank slip, so the useful part of this page is not a button
 * that charges a card - it is the account number and the reference to copy
 * onto the slip, shown as soon as a plan is chosen.
 */
export default function Memberships({
    plans,
    featureLabels,
    producers,
    payment,
}: {
    plans: Plan[];
    featureLabels: Record<string, string>;
    producers: ProducerMembership[];
    payment: { recipient: string; account: string; purpose: string; model: string };
}) {
    const [selected, setSelected] = useState<number | null>(producers[0]?.id ?? null);
    const [copied, setCopied] = useState<string | null>(null);

    const producer = producers.find((item) => item.id === selected) ?? producers[0] ?? null;

    const choose = (planId: number) => {
        if (producer) {
            router.post(route('memberships.store'), { producer_id: producer.id, plan_id: planId }, { preserveScroll: true });
        }
    };

    const copy = (value: string) => {
        navigator.clipboard
            .writeText(value)
            .then(() => {
                setCopied(value);
                setTimeout(() => setCopied(null), 2000);
            })
            .catch(() => {
                // Refused in a private window or over http; the number is on
                // screen either way.
            });
    };

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Članarina" />

            <h1 className="font-serif text-4xl sm:text-5xl">Članarina</h1>
            <p className="text-muted-foreground mt-3 max-w-xl leading-7">
                Vrelina juga ne uzima procenat od vaše prodaje — sav novac od prodatog ostaje vama. Platforma se izdržava od godišnje članarine.
            </p>

            {producers.length === 0 ? (
                <p className="text-muted-foreground mt-8 text-sm">Članarina se odnosi na stranicu proizvođača, a vi je još nemate.</p>
            ) : (
                <>
                    {producers.length > 1 && (
                        <div className="mt-8 flex flex-wrap gap-2">
                            {producers.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setSelected(item.id)}
                                    className={cn(
                                        'rounded-md border px-3 py-2 text-sm transition-colors',
                                        producer?.id === item.id ? 'border-primary bg-olive-soft text-olive' : 'border-border hover:bg-muted',
                                    )}
                                >
                                    {item.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {producer?.active && (
                        <p className="border-olive/30 bg-olive-soft text-olive mt-8 rounded-lg border p-4 text-sm">
                            Aktivan paket: <strong>{producer.current_plan?.name}</strong> — važi do{' '}
                            {new Date(producer.active.ends_at).toLocaleDateString('sr-RS')}.
                        </p>
                    )}

                    {producer?.pending && (
                        <section className="border-gold/50 bg-cream-deep mt-8 rounded-lg border p-5">
                            <h2 className="font-serif text-2xl">Uplatnica</h2>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Članarinu aktiviramo čim vidimo uplatu. Prepišite podatke na uplatnicu — poziv na broj je najvažniji, po njemu vas
                                prepoznajemo.
                            </p>

                            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                                {[
                                    { label: 'Primalac', value: payment.recipient },
                                    { label: 'Račun primaoca', value: payment.account },
                                    { label: 'Svrha uplate', value: payment.purpose },
                                    { label: 'Model', value: payment.model },
                                    { label: 'Poziv na broj', value: producer.pending.reference },
                                    { label: 'Iznos', value: `${dinars.format(producer.pending.amount_rsd)} RSD` },
                                ].map((row) => (
                                    <div key={row.label} className="min-w-0">
                                        <dt className="text-muted-foreground text-xs">{row.label}</dt>
                                        <dd className="flex items-center gap-2">
                                            <span className="font-medium break-words">{row.value}</span>
                                            <button
                                                type="button"
                                                onClick={() => copy(row.value)}
                                                aria-label={`Kopiraj: ${row.label}`}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                {copied === row.value ? <Check className="text-olive size-3.5" /> : <Copy className="size-3.5" />}
                                            </button>
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    )}

                    <div className="mt-10 grid gap-6 md:grid-cols-3">
                        {plans.map((plan) => {
                            const isCurrent = producer?.current_plan?.id === plan.id && producer?.active;

                            return (
                                <article
                                    key={plan.id}
                                    className={cn(
                                        'flex flex-col rounded-lg border p-5',
                                        isCurrent ? 'border-olive bg-olive-soft/30' : 'border-border/70',
                                    )}
                                >
                                    <h2 className="font-serif text-2xl">{plan.name}</h2>
                                    <p className="mt-1 font-serif text-3xl">
                                        {dinars.format(plan.price_rsd)} <span className="text-muted-foreground font-sans text-sm">RSD / god</span>
                                    </p>

                                    {plan.description && <p className="text-muted-foreground mt-3 text-sm leading-6">{plan.description}</p>}

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

                                    <div className="mt-auto pt-5">
                                        {isCurrent ? (
                                            <p className="text-olive text-sm font-medium">Trenutno aktivan</p>
                                        ) : (
                                            <Button variant={plan.level > 0 ? 'default' : 'outline'} onClick={() => choose(plan.id)}>
                                                {producer?.active ? 'Pređi na ovaj paket' : 'Izaberi paket'}
                                            </Button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <p className="text-muted-foreground mt-8 max-w-xl text-sm leading-6">
                        Kada članarina istekne, vaša stranica ostaje na sajtu i zadržava sve što ste uneli — gubite samo dodatne pogodnosti paketa dok
                        ne obnovite.
                    </p>
                </>
            )}
        </MarketplaceLayout>
    );
}
