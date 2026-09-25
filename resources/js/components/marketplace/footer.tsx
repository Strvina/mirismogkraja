import { Link } from '@inertiajs/react';
import Brand from './brand';

/**
 * Shared site footer (task 7.1 - was previously only on the landing page;
 * now used on every marketplace page too, per task 7.2's consistency goal).
 *
 * The catalog links go through Inertia rather than a plain anchor, so
 * following one swaps the page instead of reloading the whole application.
 * The anchor to the landing page's "o nama" section stays a real anchor,
 * since it has to work from any page and ends in a fragment.
 *
 * There are no social icons: the ones that were here pointed at #top, which
 * is the kind of button task 19 asks not to exist. They belong back the day
 * there are real accounts to point them at.
 */
export default function Footer() {
    return (
        <footer className="bg-background">
            <div className="mx-auto max-w-[1380px] px-5 py-14 sm:px-8 lg:px-12">
                <div className="border-border grid gap-10 border-b pb-12 md:grid-cols-[1.4fr_1fr_1fr]">
                    <div>
                        <Brand />
                        <p className="text-muted-foreground mt-5 max-w-xs text-sm leading-6">
                            Mesto gde upoznajete ljude, proizvođače i ukuse juga Srbije.
                        </p>
                    </div>
                    <div>
                        <p className="text-primary mb-4 text-xs font-semibold tracking-[0.14em] uppercase">Istražite</p>
                        <nav className="grid gap-3 text-sm">
                            <Link href={route('marketplace.producers.index')} className="hover:opacity-70">
                                Proizvođači
                            </Link>
                            <Link href={route('marketplace.products.index')} className="hover:opacity-70">
                                Proizvodi
                            </Link>
                            <a href="/#o-nama" className="hover:opacity-70">
                                O nama
                            </a>
                        </nav>
                    </div>
                    <div>
                        <p className="text-primary mb-4 text-xs font-semibold tracking-[0.14em] uppercase">Budimo u kontaktu</p>
                        <a className="text-sm hover:opacity-70" href="mailto:zdravo@vrelinajuga.rs">
                            zdravo@vrelinajuga.rs
                        </a>
                    </div>
                </div>
                <div className="text-muted-foreground flex flex-col gap-2 pt-6 text-xs sm:flex-row sm:justify-between">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>© 2026 Vrelina juga</span>
                        <Link href={route('legal.terms')} className="hover:text-foreground transition-colors">
                            Uslovi korišćenja
                        </Link>
                        <Link href={route('legal.privacy')} className="hover:text-foreground transition-colors">
                            Politika privatnosti
                        </Link>
                    </p>
                    <p>Pažljivo birano. Od srca predstavljeno.</p>
                </div>
            </div>
        </footer>
    );
}
