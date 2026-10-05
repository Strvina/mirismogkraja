import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import ProducerCard, { type ProducerCardProducer } from '@/components/marketplace/producer-card';
import ProductCard, { type ProductCardProduct } from '@/components/marketplace/product-card';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t, tx } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

interface PlaceCategory {
    id: number;
    name: string;
    slug: string;
}

/**
 * Everything sold from one town, or one category of it. A landing page for
 * a search like "domaći med Niš": the heading says what and where, and the
 * links below it lead to the same town's other categories.
 */
export default function PlaceShow({
    place,
    category,
    categories,
    producers,
    products,
}: {
    place: { slug: string; name: string };
    /** Set on a category's page within the place (/mesto/nis/med). */
    category: PlaceCategory | null;
    /** The categories something is sold in from here. */
    categories: PlaceCategory[];
    /** The first few producers of the place; empty on a category page. */
    producers: ProducerCardProducer[];
    products: Paginated<ProductCardProduct>;
}) {
    const { auth } = usePage<SharedData>().props;
    const placeHref = route('marketplace.places.show', place.slug);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: tx('Proizvodi'), href: route('marketplace.products.index') },
        { title: place.name, href: placeHref },
        ...(category ? [{ title: category.name, href: route('marketplace.places.category', [place.slug, category.slug]) }] : []),
    ];

    const title = category
        ? t(':category — :place', { category: t(category.name), place: place.name })
        : t('Domaći proizvodi — :place', { place: place.name });

    const chip = (active: boolean) =>
        cn(
            'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
            active ? 'border-primary bg-olive-soft text-olive' : 'border-border/70 hover:border-primary/40 hover:bg-muted/40',
        );

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`${title} | Vrelina juga`} />

            <h1 className="font-serif text-4xl sm:text-5xl">{title}</h1>
            <p className="text-muted-foreground mt-3 max-w-xl leading-7">
                {category
                    ? t('„:category” od domaćih proizvođača iz mesta :place. Pišite im direktno, bez posrednika.', {
                          category: t(category.name),
                          place: place.name,
                      })
                    : t('Domaći proizvodi i proizvođači iz mesta :place. Pišite im direktno, bez posrednika.', { place: place.name })}
            </p>

            {categories.length > 0 && (
                <nav aria-label={t('Kategorije')} className="mt-8 flex flex-wrap gap-2">
                    <Link href={placeHref} className={chip(category === null)}>
                        {t('Sve')}
                    </Link>
                    {categories.map((item) => (
                        <Link
                            key={item.id}
                            href={route('marketplace.places.category', [place.slug, item.slug])}
                            className={chip(category?.id === item.id)}
                        >
                            {t(item.name)}
                        </Link>
                    ))}
                </nav>
            )}

            {producers.length > 0 && (
                <section className="mt-12">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <h2 className="font-serif text-2xl">{t('Proizvođači iz mesta :place', { place: place.name })}</h2>
                        <Link
                            href={route('marketplace.producers.index', { city: place.name })}
                            className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                        >
                            {t('Svi proizvođači')}
                        </Link>
                    </div>
                    <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {producers.map((producer) => (
                            <ProducerCard key={producer.id} producer={producer} />
                        ))}
                    </div>
                </section>
            )}

            <section className="mt-12">
                <h2 className="font-serif text-2xl">{t('Proizvodi')}</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                    {t('Prikazano :from–:to od :total', { from: products.from, to: products.to, total: products.total })}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                    {products.data.map((product) => (
                        <ProductCard key={product.id} product={product} canFavorite={Boolean(auth.user)} />
                    ))}
                </div>
                <Pagination meta={products} />
            </section>
        </MarketplaceLayout>
    );
}
