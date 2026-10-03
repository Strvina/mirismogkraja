import { t } from '@/lib/i18n';
import { Link } from '@inertiajs/react';
import Brand from './brand';

/**
 * The site footer, the same on every page.
 *
 * The catalog links go through Inertia rather than a plain anchor, so
 * following one swaps the page instead of reloading the whole application.
 * The anchor to the landing page's "o nama" section stays a real anchor,
 * since it has to work from any page and ends in a fragment.
 *
 * No social icons until there are real accounts to point them at - an icon
 * that leads nowhere is worse than none.
 */
export default function Footer() {
    return (
        <footer className="bg-background">
            <div className="mx-auto max-w-[1380px] px-5 py-14 sm:px-8 lg:px-12">
                <div className="border-border grid gap-10 border-b pb-12 md:grid-cols-[1.4fr_1fr_1fr]">
                    <div>
                        <Brand />
                        <p className="text-muted-foreground mt-5 max-w-xs text-sm leading-6">
                            {t('Mesto gde upoznajete ljude, proizvođače i ukuse juga Srbije.')}
                        </p>
                    </div>
                    <div>
                        <p className="text-primary mb-4 text-xs font-semibold tracking-[0.14em] uppercase">{t('Istražite')}</p>
                        <nav className="grid gap-3 text-sm">
                            <Link href={route('marketplace.producers.index')} className="hover:opacity-70">
                                {t('Proizvođači')}
                            </Link>
                            <Link href={route('marketplace.products.index')} className="hover:opacity-70">
                                {t('Proizvodi')}
                            </Link>
                            <a href="/#o-nama" className="hover:opacity-70">
                                {t('O nama')}
                            </a>
                        </nav>
                    </div>
                    <div>
                        <p className="text-primary mb-4 text-xs font-semibold tracking-[0.14em] uppercase">{t('Budimo u kontaktu')}</p>
                        <a className="text-sm hover:opacity-70" href="mailto:zdravo@vrelinajuga.rs">
                            {t('zdravo@vrelinajuga.rs')}
                        </a>
                    </div>
                </div>
                <div className="text-muted-foreground flex flex-col gap-2 pt-6 text-xs sm:flex-row sm:justify-between">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>{t('© 2026 Vrelina juga')}</span>
                        <Link href={route('legal.terms')} className="hover:text-foreground transition-colors">
                            {t('Uslovi korišćenja')}
                        </Link>
                        <Link href={route('legal.privacy')} className="hover:text-foreground transition-colors">
                            {t('Politika privatnosti')}
                        </Link>
                    </p>
                    <p>{t('Pažljivo birano. Od srca predstavljeno.')}</p>
                </div>
            </div>
        </footer>
    );
}
