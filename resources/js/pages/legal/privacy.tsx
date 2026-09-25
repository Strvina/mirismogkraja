import MarketplaceLayout from '@/layouts/marketplace-layout';
import { Head } from '@inertiajs/react';

/**
 * What the site actually stores, written from the code rather than from a
 * template: a short accurate page beats a long generic one describing data
 * we never collect.
 */
export default function Privacy() {
    return (
        <MarketplaceLayout>
            <Head title="Politika privatnosti | Vrelina juga" />

            <article className="max-w-2xl">
                <h1 className="font-serif text-4xl sm:text-5xl">Politika privatnosti</h1>

                <section className="mt-8 space-y-4 leading-7">
                    <h2 className="font-serif text-2xl">Šta čuvamo</h2>
                    <ul className="text-muted-foreground list-disc space-y-2 pl-5">
                        <li>Ime, email i lozinku (u šifrovanom obliku) — da biste imali nalog.</li>
                        <li>Telefon, adresu i grad, ako ih sami unesete.</li>
                        <li>Profilnu sliku, ako je postavite.</li>
                        <li>Poruke između vas i proizvođača, da bi razgovor imao istoriju.</li>
                        <li>Utiske, omiljene proizvode i proizvođače koje pratite.</li>
                        <li>Zapis o izmenama proizvoda i proizvođača, radi evidencije.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4 leading-7">
                    <h2 className="font-serif text-2xl">Šta ne radimo</h2>
                    <p className="text-muted-foreground">
                        Ne primamo uplate i ne čuvamo podatke o karticama — plaćanje se dogovara direktno sa proizvođačem. Ne prodajemo podatke i ne
                        koristimo reklamne mreže za praćenje.
                    </p>
                </section>

                <section className="mt-10 space-y-4 leading-7">
                    <h2 className="font-serif text-2xl">Ko vidi šta</h2>
                    <p className="text-muted-foreground">
                        Vaše ime i profilna slika vide se uz utisak koji ostavite. Poruke vide samo vi i proizvođač sa kojim se dopisujete. Broj
                        telefona proizvođača se prikazuje tek kad posetilac klikne „Prikaži broj“.
                    </p>
                </section>

                <section className="mt-10 space-y-4 leading-7">
                    <h2 className="font-serif text-2xl">Brisanje naloga</h2>
                    <p className="text-muted-foreground">
                        Nalog možete obrisati u „Moj nalog“. Tada se vaše stranice proizvođača povlače sa sajta. Poruke i utisci mogu ostati zapisani
                        tamo gde su potrebni drugoj strani razgovora.
                    </p>
                </section>

                <p className="text-muted-foreground border-border/70 mt-10 border-t pt-6 text-sm">
                    Ovaj tekst opisuje kako aplikacija danas radi i nije pravno mišljenje. Pre lansiranja treba da ga pregleda pravnik, naročito u
                    odnosu na obaveze iz Zakona o zaštiti podataka o ličnosti.
                </p>
            </article>
        </MarketplaceLayout>
    );
}
