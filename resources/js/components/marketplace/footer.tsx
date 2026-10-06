import { t } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import Brand from './brand';

/**
 * The site footer, the same on every page.
 *
 * The links go through Inertia rather than a plain anchor, so following one
 * swaps the page instead of reloading the whole application.
 *
 * No social icons until there are real accounts to point them at - an icon
 * that leads nowhere is worse than none.
 */
export default function Footer() {
    const { contactEmail } = usePage<SharedData>().props;

    return (
        <footer className="bg-background">
            <div className="mx-auto max-w-[1380px] px-5 py-14 sm:px-8 lg:px-12">
                <div className="border-border grid gap-10 border-b pb-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
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
                            <Link href={route('marketplace.season.index')} className="hover:opacity-70">
                                {t('Sada u sezoni')}
                            </Link>
                            <Link href={route('marketplace.posts.index')} className="hover:opacity-70">
                                {t('Priče i recepti')}
                            </Link>
                        </nav>
                    </div>
                    <div>
                        <p className="text-primary mb-4 text-xs font-semibold tracking-[0.14em] uppercase">{t('Upoznajte nas')}</p>
                        <nav className="grid gap-3 text-sm">
                            <Link href={route('info.how')} className="hover:opacity-70">
                                {t('Kako radi')}
                            </Link>
                            <Link href={route('info.producers')} className="hover:opacity-70">
                                {t('Za proizvođače')}
                            </Link>
                            <Link href={route('info.faq')} className="hover:opacity-70">
                                {t('Česta pitanja')}
                            </Link>
                            <Link href={route('info.about')} className="hover:opacity-70">
                                {t('O nama')}
                            </Link>
                            <Link href={route('info.contact')} className="hover:opacity-70">
                                {t('Kontakt')}
                            </Link>
                        </nav>
                    </div>
                    <div>
                        <p className="text-primary mb-4 text-xs font-semibold tracking-[0.14em] uppercase">{t('Budimo u kontaktu')}</p>
                        <a className="text-sm hover:opacity-70" href={`mailto:${contactEmail}`}>
                            {contactEmail}
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
