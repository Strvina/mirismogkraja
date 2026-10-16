import Head from '@/components/head';
import { type SelectOption } from '@/components/marketplace/compact-select';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t, tx } from '@/lib/i18n';
import { type BreadcrumbItem, type Category } from '@/types';
import { Link } from '@inertiajs/react';
import ProducerForm from './producer-form';

const breadcrumbs: BreadcrumbItem[] = [
    { title: tx('Moji proizvođači'), href: '/moji-proizvodjaci' },
    { title: tx('Novi proizvođač'), href: '/moji-proizvodjaci/novo' },
];

export default function ProducersCreate({
    founding,
    categories,
    districts,
}: {
    founding: { claimed: number; limit: number; remaining: number };
    categories: Category[];
    districts: SelectOption[];
}) {
    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Novi proizvođač')} />

            <div className="flex flex-col gap-4">
                <h1 className="font-serif text-4xl sm:text-5xl">{t('Novi proizvođač')}</h1>

                {/* Someone arriving from "Predstavi svoje proizvode" lands
                    in a form: first where they are and what follows. */}
                <section className="border-border/70 max-w-3xl rounded-lg border p-5">
                    <p className="leading-7">{t('Ovde pravite stranicu svog gazdinstva: ono što kupci vide kad vas nađu na sajtu.')}</p>
                    <ol className="text-muted-foreground mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-6">
                        <li>
                            {t(
                                'Popunite četiri kratka koraka: ko ste, kako kupci dobijaju robu, slike i priča, i po želji prvi proizvodi. Traje desetak minuta, a sve kasnije možete da menjate.',
                            )}
                        </li>
                        <li>
                            {t(
                                'Pošaljite prijavu. Svaku novu stranicu pregledamo pre nego što postane javna i javljamo vam obaveštenjem na sajtu kad je odobrena.',
                            )}
                        </li>
                        <li>{t('Od tada vas kupci nalaze u pretrazi i šalju vam upite, koji stižu u Poruke i na vaš mejl.')}</li>
                    </ol>
                    <p className="text-muted-foreground mt-3 text-sm">
                        {t('Za otvaranje stranice ne plaćate ništa. Pakete sa dodatnim pogodnostima možete uzeti kasnije, ako želite.')}
                    </p>
                </section>

                {/* The launch offer only means something if people can see it
                    running out. */}
                {founding.remaining > 0 && (
                    <div className="border-gold/40 bg-cream-deep flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-4 text-sm">
                        <span className="font-serif text-xl">
                            {founding.claimed} / {founding.limit}
                        </span>
                        <span className="text-muted-foreground">
                            {t(
                                'mesta među osnivačima je zauzeto. Prvih :limit odobrenih proizvođača trajno nosi svoj redni broj na profilu i dobija godinu dana Premium članstva besplatno.',
                                { limit: founding.limit },
                            )}
                        </span>
                        <Link href={route('marketplace.founding')} className="font-semibold underline underline-offset-4">
                            {t('Pogledaj listu')}
                        </Link>
                    </div>
                )}
                <ProducerForm
                    action={route('producers.store')}
                    method="post"
                    submitLabel={t('Pošalji na odobrenje')}
                    wizard
                    categories={categories}
                    districts={districts}
                />
            </div>
        </MarketplaceLayout>
    );
}
