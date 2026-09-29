import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t, tx } from '@/lib/i18n';
import { type BreadcrumbItem, type Category } from '@/types';
import { Head, Link } from '@inertiajs/react';
import ProducerForm from './producer-form';

const breadcrumbs: BreadcrumbItem[] = [
    { title: tx('Moji proizvođači'), href: '/moji-proizvodjaci' },
    { title: tx('Novi proizvođač'), href: '/moji-proizvodjaci/novo' },
];

export default function ProducersCreate({
    founding,
    categories,
}: {
    founding: { claimed: number; limit: number; remaining: number };
    categories: Category[];
}) {
    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Novi proizvođač')} />

            <div className="flex flex-col gap-4">
                <h1 className="font-serif text-4xl sm:text-5xl">{t('Novi proizvođač')}</h1>

                {/* The launch offer only means something if people can see it
                    running out (task 20.4). */}
                {founding.remaining > 0 && (
                    <div className="border-gold/40 bg-cream-deep flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-4 text-sm">
                        <span className="font-serif text-xl">
                            {founding.claimed} / {founding.limit}
                        </span>
                        <span className="text-muted-foreground">
                            mesta među osnivačima je zauzeto. Prvih {founding.limit} odobrenih proizvođača trajno nosi svoj redni broj na profilu i
                            dobija godinu dana Premium članstva besplatno.
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
                />
            </div>
        </MarketplaceLayout>
    );
}
