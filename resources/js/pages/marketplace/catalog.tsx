import Head from '@/components/head';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import PauseNotice, { type Pause } from '@/components/marketplace/pause-notice';
import ShareButtons from '@/components/marketplace/share-buttons';
import ContactCard from '@/components/producer-page/contact-card';
import MarketList from '@/components/producer-page/market-list';
import { type PublicProducer } from '@/components/producer-page/types';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { deliveryMethodLabel } from '@/lib/delivery';
import { formatPrice } from '@/lib/format';
import { t } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { seasonLabel } from '@/lib/season';
import { type ProducerMarket, type Product } from '@/types';
import { Link } from '@inertiajs/react';
import { BadgeCheck, MapPin, MessageCircle } from 'lucide-react';

type CatalogProducer = Pick<
    PublicProducer,
    'id' | 'name' | 'slug' | 'city' | 'address' | 'contact_email' | 'logo_path' | 'verified_at' | 'delivery_methods' | 'has_phone'
>;

interface CatalogProduct extends Pick<Product, 'id' | 'name' | 'slug' | 'price' | 'unit' | 'season_from' | 'season_to'> {
    category: string | null;
    image: string | null;
    /** In stock and in season right now. */
    available: boolean;
}

/** Products in the order they arrived, cut into runs of the same category. */
function byCategory(products: CatalogProduct[]): { category: string; products: CatalogProduct[] }[] {
    const groups: { category: string; products: CatalogProduct[] }[] = [];

    for (const product of products) {
        const category = product.category ?? t('Ostalo');
        const last = groups[groups.length - 1];

        if (last?.category === category) {
            last.products.push(product);
        } else {
            groups.push({ category, products: [product] });
        }
    }

    return groups;
}

/**
 * A producer's price list: everything they offer, with prices, on one page
 * meant to be sent in a chat. Rows rather than cards - on a phone a buyer
 * sees a dozen prices without scrolling.
 */
export default function Catalog({
    producer,
    phone,
    products,
    markets,
    canMessage,
    pause,
}: {
    producer: CatalogProducer;
    /** Only after "Prikaži broj": fetched by a partial reload. */
    phone?: string | null;
    products: Paginated<CatalogProduct>;
    markets: ProducerMarket[];
    canMessage: boolean;
    /** Sold out or away: no new inquiries until they are back. */
    pause: Pause | null;
}) {
    const title = t(':name — ponuda i cene', { name: producer.name });

    return (
        <MarketplaceLayout>
            <Head title={title} />

            <div className="mt-6 flex flex-wrap items-start gap-4">
                {producer.logo_path && (
                    <img src={thumbUrl(producer.logo_path)} alt="" className="size-14 shrink-0 rounded-full border object-cover sm:size-16" />
                )}
                <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">{t('Ponuda i cene')}</p>
                    <h1 className="mt-1 flex flex-wrap items-center gap-2 font-serif text-3xl break-words sm:text-4xl">
                        {producer.name}
                        {producer.verified_at && (
                            <span
                                title={t('Identitet proizvođača je proveren')}
                                className="text-olive bg-olive-soft flex items-center gap-1 rounded-full px-2.5 py-1 font-sans text-xs font-semibold"
                            >
                                <BadgeCheck className="size-3.5" />
                                {t('Provereno')}
                            </span>
                        )}
                    </h1>
                    {producer.city && (
                        <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
                            <MapPin className="size-4 shrink-0" />
                            {producer.city}
                        </p>
                    )}
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    {canMessage && (
                        <Button asChild size="sm">
                            <Link href={route('messages.show', producer.slug)}>
                                <MessageCircle className="size-4" />
                                {t('Pošalji poruku')}
                            </Link>
                        </Button>
                    )}
                    <Button asChild variant="outline" size="sm">
                        <Link href={route('marketplace.producers.show', producer.slug)}>{t('Ceo profil')}</Link>
                    </Button>
                </div>
            </div>

            <div className="mt-4">
                <ShareButtons url={route('marketplace.catalog', producer.slug)} title={title} />
            </div>

            {pause && <PauseNotice pause={pause} className="mt-5 max-w-2xl" />}

            <ContactCard producer={producer} phone={phone} />

            {products.total === 0 ? (
                <p className="text-muted-foreground mt-10 text-sm">{t('Ovaj proizvođač još nema objavljene proizvode.')}</p>
            ) : (
                <div className="mt-10 max-w-2xl space-y-8">
                    {byCategory(products.data).map((group) => (
                        <section key={group.category}>
                            <h2 className="font-serif text-xl">{group.category}</h2>
                            <ul className="divide-border/70 mt-2 divide-y">
                                {group.products.map((product) => (
                                    <li key={product.id}>
                                        <Link
                                            href={route('marketplace.products.show', product.slug)}
                                            className="hover:bg-muted/40 -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors"
                                        >
                                            <div className="bg-muted size-12 shrink-0 overflow-hidden rounded-md">
                                                {product.image && (
                                                    <img
                                                        src={thumbUrl(product.image)}
                                                        alt=""
                                                        loading="lazy"
                                                        className="image-warm size-full object-cover"
                                                    />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium break-words">{product.name}</p>
                                                {!product.available && (
                                                    <p className="text-muted-foreground text-xs">
                                                        {t('Trenutno nema')}
                                                        {seasonLabel(product) && ` · ${t('sezona')}: ${seasonLabel(product)}`}
                                                    </p>
                                                )}
                                            </div>
                                            <p className="shrink-0 text-right text-sm font-semibold tabular-nums">
                                                {formatPrice(product.price)}
                                                <span className="text-muted-foreground font-normal"> / {product.unit}</span>
                                            </p>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                    <Pagination meta={products} />
                </div>
            )}

            {producer.delivery_methods && producer.delivery_methods.length > 0 && (
                <p className="text-muted-foreground mt-10 max-w-2xl text-sm">
                    {t('Način dostave:')} {producer.delivery_methods.map(deliveryMethodLabel).join(', ')}
                </p>
            )}

            <MarketList markets={markets} />
        </MarketplaceLayout>
    );
}
