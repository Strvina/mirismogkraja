import Head from '@/components/head';
import PlanCard, { type Plan } from '@/components/marketplace/plan-card';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { formatNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Check } from 'lucide-react';

/**
 * What the site offers a producer and what it costs, readable without an
 * account. Prices come from the same rows the membership page sells from.
 */
export default function ForProducers({
    plans,
    featureLabels,
    boost,
    founding,
}: {
    plans: Plan[];
    featureLabels: Record<string, string>;
    boost: { profile_price: number; product_price: number; days: number };
    founding: { remaining: number; limit: number };
}) {
    const { auth } = usePage<SharedData>().props;

    return (
        <MarketplaceLayout>
            <Head title={t('Za proizvođače | Vrelina juga')} />

            <p className="text-primary mb-3 text-xs font-semibold tracking-[0.16em] uppercase">{t('Za proizvođače')}</p>
            <h1 className="font-serif text-4xl sm:text-5xl">{t('Vaši proizvodi pred ljudima koji traže domaće')}</h1>
            <p className="text-muted-foreground mt-4 max-w-2xl leading-7">
                {t(
                    'Vrelina juga ne uzima procenat od vaše prodaje — sav novac od prodatog ostaje vama. Platforma se izdržava od godišnje članarine.',
                )}
            </p>

            {founding.remaining > 0 && (
                <div className="border-gold/50 bg-cream-deep mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border p-5">
                    <p className="max-w-xl text-sm leading-6">
                        <strong className="font-serif text-lg">
                            {t('Još :count mesta među prvih :limit.', { count: founding.remaining, limit: founding.limit })}
                        </strong>{' '}
                        {t('Osnivači dobijaju trajan redni broj i prvu godinu Premium članstva besplatno.')}
                    </p>
                    <Button asChild variant="outline">
                        <Link href={route('marketplace.founding')}>{t('Ko su osnivači')}</Link>
                    </Button>
                </div>
            )}

            <section className="mt-12">
                <h2 className="font-serif text-2xl">{t('Šta dobijate')}</h2>
                <ul className="mt-5 grid max-w-3xl gap-3 text-sm sm:grid-cols-2">
                    {[
                        t('Svoju stranicu sa pričom, slikama i mestom na mapi'),
                        t('Proizvode sa cenom, sezonom i fotografijama'),
                        t('Upite kupaca u porukama i na e-mail'),
                        t('Cenovnik za deljenje i QR poster za tezgu'),
                        t('Pijace na kojima prodajete i potvrđene sertifikate'),
                        t('Priče i recepte koji dovode nove kupce'),
                    ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                            <Check className="text-olive mt-0.5 size-4 shrink-0" />
                            {item}
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mt-14">
                <h2 className="font-serif text-2xl">{t('Paketi i cene')}</h2>
                <div className="mt-5 grid gap-6 md:grid-cols-3">
                    {plans.map((plan) => (
                        <PlanCard key={plan.id} plan={plan} featureLabels={featureLabels} />
                    ))}
                </div>
                <p className="text-muted-foreground mt-6 max-w-2xl text-sm leading-6">
                    {t('Plaća se uplatnicom sa QR kodom, jednom godišnje. Kada članarina istekne, stranica ostaje na sajtu.')}
                </p>
            </section>

            <section className="mt-14 max-w-2xl">
                <h2 className="font-serif text-2xl">{t('Isticanje')}</h2>
                <p className="text-muted-foreground mt-3 text-sm leading-6">
                    {t(
                        'Kada želite više pažnje, stranicu ili jedan proizvod možete istaći na :days dana: stranica :profile RSD, proizvod :product RSD. Istaknuto je uvek jasno označeno.',
                        {
                            days: boost.days,
                            profile: formatNumber(boost.profile_price),
                            product: formatNumber(boost.product_price),
                        },
                    )}
                </p>
            </section>

            <div className="mt-12 flex flex-wrap gap-3">
                <Button asChild size="lg">
                    <Link href={auth.user ? route('producers.create') : route('register')}>{t('Predstavi svoje proizvode')}</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                    <Link href={route('info.faq')}>{t('Česta pitanja')}</Link>
                </Button>
            </div>
        </MarketplaceLayout>
    );
}
