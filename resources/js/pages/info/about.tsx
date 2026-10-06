import Head from '@/components/head';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t } from '@/lib/i18n';
import { Link } from '@inertiajs/react';

/** Who the site is for and why it works the way it does. */
export default function About() {
    return (
        <MarketplaceLayout>
            <Head title={t('O nama | Vrelina juga')} />

            <article className="max-w-2xl">
                <p className="text-primary mb-3 text-xs font-semibold tracking-[0.16em] uppercase">{t('O nama')}</p>
                <h1 className="font-serif text-4xl sm:text-5xl">{t('Iza svakog proizvoda stoje ljudi.')}</h1>

                <section className="mt-8 space-y-4 leading-7">
                    <p className="text-muted-foreground">
                        {t(
                            'Na jugu Srbije se i dalje pravi ajvar na šporetu na drva, suši paprika na koncu i vrca med iz desetak košnica. Ti ljudi retko imaju sajt, a kupci koji traže baš takve proizvode ne znaju gde da ih nađu.',
                        )}
                    </p>
                    <p className="text-muted-foreground">
                        {t(
                            'Vrelina juga postoji da ih spoji. Svaki proizvođač ima svoju stranicu, sa pričom, slikama i proizvodima, a kupac mu piše direktno.',
                        )}
                    </p>
                </section>

                <section className="mt-10 space-y-4 leading-7">
                    <h2 className="font-serif text-2xl">{t('Zašto bez korpe')}</h2>
                    <p className="text-muted-foreground">
                        {t(
                            'Domaća proizvodnja ne staje u korpu internet prodavnice: količine se menjaju iz nedelje u nedelju, tegla se nekad šalje poštom, a nekad preuzima na pijaci. Zato se ovde ne kupuje jednim klikom, nego se pita i dogovara, kao na pijaci.',
                        )}
                    </p>
                </section>

                <section className="mt-10 space-y-4 leading-7">
                    <h2 className="font-serif text-2xl">{t('Od čega živimo')}</h2>
                    <p className="text-muted-foreground">
                        {t(
                            'Od godišnje članarine proizvođača. Ne uzimamo procenat od prodaje i ne naplaćujemo ništa kupcima. Plaćeno isticanje je uvek jasno označeno i ne menja redosled u redovnoj listi.',
                        )}
                    </p>
                </section>

                <div className="mt-10 flex flex-wrap gap-3">
                    <Button asChild>
                        <Link href={route('marketplace.producers.index')}>{t('Upoznajte proizvođače')}</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href={route('info.contact')}>{t('Pišite nam')}</Link>
                    </Button>
                </div>
            </article>
        </MarketplaceLayout>
    );
}
