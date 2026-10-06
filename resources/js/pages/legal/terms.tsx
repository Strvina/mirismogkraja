import Head from '@/components/head';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t } from '@/lib/i18n';

/**
 * The terms, shaped by how the platform works: it has to be written down
 * that Vrelina juga is not a party to the sale.
 * The wording is plain and deliberately makes no claim to be a reviewed
 * legal document - a lawyer should go over it before launch.
 */
export default function Terms() {
    return (
        <MarketplaceLayout>
            <Head title={t('Uslovi korišćenja | Vrelina juga')} />

            <article className="max-w-2xl">
                <h1 className="font-serif text-4xl sm:text-5xl">{t('Uslovi korišćenja')}</h1>

                <section className="mt-8 space-y-4 leading-7">
                    <h2 className="font-serif text-2xl">{t('Šta je Vrelina juga')}</h2>
                    <p className="text-muted-foreground">
                        {t('Vrelina juga je mesto koje povezuje kupce sa malim proizvođačima sa juga Srbije.')}{' '}
                        <strong>{t('Mi nismo prodavnica i nismo strana u kupoprodaji.')}</strong>{' '}
                        {t('Ne naplaćujemo proizvode, ne primamo uplate, ne organizujemo dostavu i ne garantujemo za robu.')}
                    </p>
                    <p className="text-muted-foreground">
                        {t(
                            'Kada pošaljete upit, otvarate razgovor sa proizvođačem. Sve dalje — količinu, cenu, način plaćanja, preuzimanje ili dostavu — dogovarate direktno sa njim.',
                        )}
                    </p>
                </section>

                <section className="mt-10 space-y-4 leading-7">
                    <h2 className="font-serif text-2xl">{t('Šta očekujemo od korisnika')}</h2>
                    <ul className="text-muted-foreground list-disc space-y-2 pl-5">
                        <li>{t('Podaci koje unosite treba da budu tačni — naročito ime proizvođača, opis proizvoda i cena.')}</li>
                        <li>{t('Poruke služe za dogovor oko proizvoda, ne za reklamu ni uznemiravanje.')}</li>
                        <li>{t('Utisak ostavljate samo o proizvođaču sa kojim ste zaista bili u kontaktu.')}</li>
                        <li>{t('Ako neko prekrši ova pravila, koristite dugme „Prijavi problem“.')}</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4 leading-7">
                    <h2 className="font-serif text-2xl">{t('Nalozi i sadržaj')}</h2>
                    <p className="text-muted-foreground">
                        {t(
                            'Nalog možemo privremeno blokirati ako dobijemo osnovanu prijavu ili primetimo zloupotrebu. Stranicu proizvođača objavljujemo tek posle provere, a utiske posle pregleda, da bismo sprečili spam i neprimeren sadržaj.',
                        )}
                    </p>
                    <p className="text-muted-foreground">
                        {t(
                            'Proizvođač sam menja opis, priču, kontakt, slike i proizvode. Naziv objavljenog proizvođača menjamo na zahtev, jer je to ono po čemu vas kupci prepoznaju.',
                        )}
                    </p>
                </section>

                <section className="mt-10 space-y-4 leading-7">
                    <h2 className="font-serif text-2xl">{t('Odgovornost')}</h2>
                    <p className="text-muted-foreground">
                        {t(
                            'Pošto ne učestvujemo u transakciji, ne odgovaramo za kvalitet robe, rokove, isplate ni za dogovore sklopljene van platforme. Trudimo se da uklonimo naloge koji zloupotrebljavaju poverenje, ali procena pre kupovine ostaje na vama.',
                        )}
                    </p>
                </section>

                <p className="text-muted-foreground border-border/70 mt-10 border-t pt-6 text-sm">
                    {t(
                        'Ovaj tekst je napisan jasnim jezikom radi razumevanja i nije pravno mišljenje. Pre zvaničnog lansiranja treba da ga pregleda pravnik, naročito deo o tome ko izdaje račun i kakve poreske obaveze nastaju.',
                    )}
                </p>
            </article>
        </MarketplaceLayout>
    );
}
