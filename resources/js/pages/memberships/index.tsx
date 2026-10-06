import Head from '@/components/head';
import PaymentSlipDialog, { type PaymentSlip } from '@/components/marketplace/payment-slip-dialog';
import { HowItWorks, linkedSlipId } from '@/components/marketplace/payment-status';
import PlanCard, { type Plan } from '@/components/marketplace/plan-card';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { formatDate } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { router } from '@inertiajs/react';
import { CalendarCheck, MousePointerClick, ReceiptText } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: tx('Članarina'), href: '/clanarina' }];

interface ProducerMembership {
    id: number;
    name: string;
    status: string;
    current_plan: { id: number; name: string; level: number } | null;
    active: { id: number; ends_at: string } | null;
    /** Paid for and waiting behind the active one, in the order they will run. */
    upcoming: { id: number; plan: string | null; starts_at: string; ends_at: string }[];
    pending: { id: number; created_at: string; plan: string | null; slip: PaymentSlip; download_url: string } | null;
}

/** The producer a notification link names (?proizvodjac=3), if it is one of theirs. */
function linkedProducerId(producers: ProducerMembership[]): number | null {
    const id = Number(new URLSearchParams(window.location.search).get('proizvodjac'));

    return producers.some((producer) => producer.id === id) ? id : null;
}

/**
 * Memberships from the producer's side.
 *
 * Payment is by bank slip, so the useful part of this page is not a button
 * that charges a card - it is the account number and the reference to copy
 * onto the slip, shown as soon as a plan is chosen.
 */
export default function Memberships({
    plans,
    featureLabels,
    producers,
}: {
    plans: Plan[];
    featureLabels: Record<string, string>;
    producers: ProducerMembership[];
}) {
    const [selected, setSelected] = useState<number | null>(() => linkedProducerId(producers) ?? producers[0]?.id ?? null);
    // The slip opens by itself the moment a plan is chosen: that is the one
    // thing the producer has to act on, and hiding it behind a second click
    // is how a membership goes unpaid.
    const [slipOpen, setSlipOpen] = useState(() => {
        const linked = linkedSlipId();

        return linked !== null && producers.some((producer) => producer.pending?.id === linked);
    });

    const producer = producers.find((item) => item.id === selected) ?? producers[0] ?? null;

    const choose = (planId: number) => {
        if (producer) {
            router.post(
                route('memberships.store'),
                { producer_id: producer.id, plan_id: planId },
                { preserveScroll: true, onSuccess: () => setSlipOpen(true) },
            );
        }
    };

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Članarina')} />

            <h1 className="font-serif text-4xl sm:text-5xl">{t('Članarina')}</h1>
            <p className="text-muted-foreground mt-3 max-w-xl leading-7">
                {t(
                    'Vrelina juga ne uzima procenat od vaše prodaje — sav novac od prodatog ostaje vama. Platforma se izdržava od godišnje članarine.',
                )}
            </p>

            <div className="mt-8">
                <HowItWorks
                    steps={[
                        {
                            icon: MousePointerClick,
                            title: t('Izaberite paket'),
                            text: t('Viši paket donosi oznaku Premium, istaknuto mesto i statistiku.'),
                        },
                        {
                            icon: ReceiptText,
                            title: t('Uplatite'),
                            text: t('Uplatnica sa QR kodom se otvara odmah — platite u banci ili aplikaciji.'),
                        },
                        {
                            icon: CalendarCheck,
                            title: t('Važi godinu dana'),
                            text: t('Aktiviramo čim uplata stigne. Dve nedelje pred istek podsetićemo vas; profil ostaje na sajtu i posle.'),
                        },
                    ]}
                />
            </div>

            {producers.length === 0 ? (
                <p className="text-muted-foreground mt-8 text-sm">{t('Članarina se odnosi na stranicu proizvođača, a vi je još nemate.')}</p>
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
                        <div
                            id={`clanarina-${producer.active.id}`}
                            className="border-olive/30 bg-olive-soft text-olive target:ring-gold/60 mt-8 scroll-mt-24 space-y-1 rounded-lg border p-4 text-sm target:ring-2"
                        >
                            <p>
                                {t('Aktivan paket:')} <strong>{producer.current_plan?.name}</strong> —{' '}
                                {t('važi do :date', { date: formatDate(producer.active.ends_at) })}.
                            </p>
                            {producer.upcoming.map((item) => (
                                <p key={item.id}>
                                    {t('Zatim: :plan, od :from do :to.', {
                                        plan: item.plan,
                                        from: formatDate(item.starts_at),
                                        to: formatDate(item.ends_at),
                                    })}
                                </p>
                            ))}
                        </div>
                    )}

                    {producer?.pending && (
                        <section className="border-gold/50 bg-cream-deep mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border p-5">
                            <div className="min-w-0">
                                <h2 className="font-serif text-2xl">{t('Čeka se uplata')}</h2>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    {t('Paket „:name”', { name: producer.pending.plan })} — {t('poziv na broj')}{' '}
                                    <span className="text-foreground font-medium">{producer.pending.slip.reference}</span>, {t('iznos')}{' '}
                                    {producer.pending.slip.amount} RSD.
                                </p>
                            </div>

                            <Button onClick={() => setSlipOpen(true)}>
                                <ReceiptText className="size-4" />
                                {t('Otvori uplatnicu')}
                            </Button>
                        </section>
                    )}

                    <div className="mt-10 grid gap-6 md:grid-cols-3">
                        {plans.map((plan) => {
                            const isCurrent = producer?.current_plan?.id === plan.id && producer?.active;

                            return (
                                <PlanCard key={plan.id} plan={plan} featureLabels={featureLabels} highlighted={Boolean(isCurrent)}>
                                    {isCurrent ? (
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <p className="text-olive text-sm font-medium">{t('Trenutno aktivan')}</p>
                                            {/* Paying early costs nothing: the new year starts where this one ends. */}
                                            <Button variant="outline" size="sm" onClick={() => choose(plan.id)}>
                                                {t('Produži')}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button variant={plan.level > 0 ? 'default' : 'outline'} onClick={() => choose(plan.id)}>
                                            {producer?.active ? t('Pređi na ovaj paket') : t('Izaberi paket')}
                                        </Button>
                                    )}
                                </PlanCard>
                            );
                        })}
                    </div>

                    <p className="text-muted-foreground mt-8 max-w-xl text-sm leading-6">
                        {t(
                            'Viši paket počinje odmah, a neiskorišćeni dani tekućeg nastavljaju se posle njega. Produženje istog paketa nadovezuje se na kraj tekućeg, pa ranijom uplatom ne gubite ništa.',
                        )}
                    </p>

                    <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6">
                        {t(
                            'Kada članarina istekne, vaša stranica ostaje na sajtu i zadržava sve što ste uneli — gubite samo dodatne pogodnosti paketa dok ne obnovite.',
                        )}
                    </p>
                </>
            )}
            {producer?.pending && (
                <PaymentSlipDialog
                    slip={producer.pending.slip}
                    downloadUrl={producer.pending.download_url}
                    open={slipOpen}
                    onOpenChange={setSlipOpen}
                />
            )}
        </MarketplaceLayout>
    );
}
