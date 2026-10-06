import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import ProductCard, { type ProductCardProduct } from '@/components/marketplace/product-card';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t } from '@/lib/i18n';
import { monthName } from '@/lib/season';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

interface SeasonMonth {
    number: number;
    slug: string;
    has_products: boolean;
}

/**
 * What is in season in one month, with the whole year a click away. Only
 * products whose producer set a season: the rest are sold all year and are
 * in the catalogue.
 */
export default function Season({
    month,
    isCurrent,
    months,
    products,
}: {
    month: number;
    /** Whether this is the month we are in. */
    isCurrent: boolean;
    months: SeasonMonth[];
    products: Paginated<ProductCardProduct>;
}) {
    const { auth } = usePage<SharedData>().props;
    const name = monthName(month, 'long');

    return (
        <MarketplaceLayout>
            <Head title={t('U sezoni: :month | Vrelina juga', { month: name })} />

            <p className="text-primary mb-3 text-xs font-semibold tracking-[0.16em] uppercase">
                {isCurrent ? t('Sada u sezoni') : t('Kalendar sezone')}
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl">{t('U sezoni: :month', { month: name })}</h1>
            <p className="text-muted-foreground mt-3 max-w-xl leading-7">
                {t('Domaće ima svoje vreme. Ovo su proizvodi kojima je sezona baš u ovom mesecu.')}
            </p>

            <nav aria-label={t('Meseci')} className="mt-8 flex flex-wrap gap-2">
                {months.map((item) => (
                    <Link
                        key={item.number}
                        href={route('marketplace.season.show', item.slug)}
                        aria-current={item.number === month ? 'page' : undefined}
                        className={cn(
                            'rounded-full border px-3.5 py-1.5 text-sm capitalize transition-colors',
                            item.number === month
                                ? 'border-primary bg-olive-soft text-olive'
                                : 'border-border/70 hover:border-primary/40 hover:bg-muted/40',
                            // Still a link - the month has an address - but visibly empty.
                            !item.has_products && item.number !== month && 'text-muted-foreground/60',
                        )}
                    >
                        {monthName(item.number)}
                    </Link>
                ))}
            </nav>

            {products.data.length === 0 ? (
                <div className="py-16 text-center">
                    <p className="text-muted-foreground text-sm">{t('Za ovaj mesec još nema sezonskih proizvoda.')}</p>
                    <Link
                        href={route('marketplace.products.index')}
                        className="text-primary mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline"
                    >
                        {t('Pogledaj proizvode')}
                    </Link>
                </div>
            ) : (
                <>
                    <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                        {products.data.map((product) => (
                            <ProductCard key={product.id} product={product} canFavorite={Boolean(auth.user)} />
                        ))}
                    </div>
                    <Pagination meta={products} />
                </>
            )}
        </MarketplaceLayout>
    );
}
