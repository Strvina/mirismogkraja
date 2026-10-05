import { HowItWorks } from '@/components/marketplace/payment-status';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Handshake, MessageCircle, MessagesSquare, Search, Store, Wallet } from 'lucide-react';

/**
 * How the site works, for both sides. The point a first-time visitor most
 * often misses is that there is nothing to pay here, so it is said before
 * the steps rather than after them.
 */
export default function HowItWorksPage() {
    const { auth } = usePage<SharedData>().props;

    return (
        <MarketplaceLayout>
            <Head title={t('Kako radi | Vrelina juga')} />

            <p className="text-primary mb-3 text-xs font-semibold tracking-[0.16em] uppercase">{t('Kako to ide')}</p>
            <h1 className="font-serif text-4xl sm:text-5xl">{t('Kako radi Vrelina juga')}</h1>
            <p className="text-muted-foreground mt-4 max-w-2xl leading-7">
                {t('Vrelina juga je mesto koje povezuje kupce sa malim proizvođačima sa juga Srbije.')}{' '}
                <strong className="text-foreground">{t('Nije prodavnica: nema korpe ni plaćanja na sajtu.')}</strong>{' '}
                {t('Vi pišete proizvođaču, a sve ostalo dogovarate direktno sa njim.')}
            </p>

            <section className="mt-12">
                <h2 className="font-serif text-2xl">{t('Ako tražite domaće')}</h2>
                <div className="mt-5">
                    <HowItWorks
                        steps={[
                            {
                                icon: Search,
                                title: t('Pronađite'),
                                text: t('Pretražite proizvode i proizvođače po kategoriji, mestu ili na mapi.'),
                            },
                            {
                                icon: MessageCircle,
                                title: t('Pošaljite upit'),
                                text: t('Napišite proizvođaču šta vam treba. Odgovor stiže u poruke i na e-mail.'),
                            },
                            {
                                icon: Handshake,
                                title: t('Dogovorite se'),
                                text: t('Količinu, cenu, plaćanje i dostavu dogovarate direktno, bez posrednika.'),
                            },
                        ]}
                    />
                </div>
                <Button asChild className="mt-6">
                    <Link href={route('marketplace.products.index')}>{t('Pogledaj proizvode')}</Link>
                </Button>
            </section>

            <section className="mt-14">
                <h2 className="font-serif text-2xl">{t('Ako pravite domaće')}</h2>
                <div className="mt-5">
                    <HowItWorks
                        steps={[
                            {
                                icon: Store,
                                title: t('Otvorite stranicu'),
                                text: t('Predstavite se, dodajte slike i proizvode. Stranicu objavljujemo posle kratke provere.'),
                            },
                            {
                                icon: MessagesSquare,
                                title: t('Odgovarajte na upite'),
                                text: t('Kupci vam pišu sa stranice proizvoda, a obaveštenje stiže i na e-mail.'),
                            },
                            {
                                icon: Wallet,
                                title: t('Prodajte po svome'),
                                text: t('Sav novac od prodaje ostaje vama. Ne uzimamo procenat.'),
                            },
                        ]}
                    />
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                    <Button asChild>
                        <Link href={auth.user ? route('producers.create') : route('register')}>{t('Predstavi svoje proizvode')}</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href={route('info.producers')}>{t('Paketi i cene')}</Link>
                    </Button>
                </div>
            </section>

            <p className="text-muted-foreground border-border/70 mt-14 max-w-2xl border-t pt-6 text-sm leading-6">
                {t('Imate još pitanja?')}{' '}
                <Link href={route('info.faq')} className="text-foreground underline underline-offset-4">
                    {t('Pogledajte česta pitanja')}
                </Link>
                .
            </p>
        </MarketplaceLayout>
    );
}
