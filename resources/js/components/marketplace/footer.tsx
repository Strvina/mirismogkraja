import { Instagram } from 'lucide-react';
import Brand from './brand';

/**
 * Shared site footer (task 7.1 - was previously only on the landing page;
 * now used on every marketplace page too, per task 7.2's consistency goal).
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
                            <a href="/proizvodjaci">Proizvođači</a>
                            <a href="/proizvodi">Proizvodi</a>
                            <a href="/#o-nama">O nama</a>
                        </nav>
                    </div>
                    <div>
                        <p className="text-primary mb-4 text-xs font-semibold tracking-[0.14em] uppercase">Budimo u kontaktu</p>
                        <a className="text-sm" href="mailto:zdravo@vrelinajuga.rs">
                            zdravo@vrelinajuga.rs
                        </a>
                        <div className="mt-5 flex items-center gap-4">
                            <a href="#top" aria-label="Instagram">
                                <Instagram className="size-5" />
                            </a>
                            <a href="#top" aria-label="Facebook" className="font-serif text-lg font-bold">
                                f
                            </a>
                        </div>
                    </div>
                </div>
                <div className="text-muted-foreground flex flex-col gap-2 pt-6 text-xs sm:flex-row sm:justify-between">
                    <p>© 2026 Vrelina juga</p>
                    <p>Pažljivo birano. Od srca predstavljeno.</p>
                </div>
            </div>
        </footer>
    );
}
