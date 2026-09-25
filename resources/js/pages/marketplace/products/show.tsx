import FavoriteButton from '@/components/favorite-button';
import ReportButton from '@/components/marketplace/report-button';
import ShareButtons from '@/components/marketplace/share-buttons';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { formatPrice } from '@/lib/format';
import { type Producer, type Product, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { MapPin } from 'lucide-react';
import { useState } from 'react';

type FullProduct = Product & { producer: Producer };

export default function ProductShow({
    product,
    similar,
    canInquire,
    canReport,
    reportReasons,
    isFavorited,
}: {
    product: FullProduct;
    similar: Product[];
    canInquire: boolean;
    canReport: boolean;
    reportReasons: Record<string, string>;
    isFavorited: boolean;
}) {
    const { auth } = usePage<SharedData>().props;
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const images = [...(product.images ?? [])].sort((a, b) => a.order - b.order);
    const shareUrl = typeof window === 'undefined' ? '' : window.location.href;
    const mainImage = images[0];

    const sendInquiry = () => {
        if (!message.trim()) {
            return;
        }

        router.post(
            route('inquiries.store', product.slug),
            { body: message },
            { onStart: () => setSending(true), onFinish: () => setSending(false) },
        );
    };

    return (
        <MarketplaceLayout>
            <Head title={product.name} />

            <div className="grid gap-10 lg:grid-cols-2">
                <div className="bg-muted aspect-square overflow-hidden rounded-md">
                    {mainImage && <img src={`/storage/${mainImage.path}`} alt={product.name} className="image-warm size-full object-cover" />}
                </div>

                <div>
                    <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">{product.category?.name}</p>
                    <h1 className="mt-2 font-serif text-3xl break-words sm:text-4xl">{product.name}</h1>
                    <p className="mt-3 font-serif text-2xl">
                        {formatPrice(product.price)} <span className="text-muted-foreground font-sans text-sm">/ {product.unit}</span>
                    </p>

                    {product.description && <p className="text-muted-foreground mt-6 leading-7 break-words">{product.description}</p>}

                    <div className="mt-6 space-y-3">
                        {canInquire && (
                            <>
                                <p className="text-muted-foreground text-sm">
                                    Pitajte proizvođača za dostupnost, količinu i dostavu — dogovor ide direktno između vas.
                                </p>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    maxLength={2000}
                                    placeholder="Zdravo, zainteresovan/a sam za..."
                                    aria-label="Poruka proizvođaču"
                                    className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                                />
                            </>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                            {canInquire ? (
                                <Button onClick={sendInquiry} disabled={sending || !message.trim()}>
                                    Pošalji upit
                                </Button>
                            ) : (
                                !auth.user && (
                                    <Button asChild>
                                        <Link href={route('login')}>Prijavite se da pošaljete upit</Link>
                                    </Button>
                                )
                            )}
                            {auth.user && <FavoriteButton type="product" id={product.id} isFavorited={isFavorited} />}
                            {canReport && <ReportButton type="product" id={product.id} reasons={reportReasons} />}
                        </div>

                        {/* A link to a jar of honey travels by Viber here, so
                            the buttons are plain links rather than an embedded
                            widget that would load tracking on every page. */}
                        <ShareButtons url={shareUrl} title={product.name} className="mt-4" />
                    </div>

                    <Link
                        href={route('marketplace.producers.show', product.producer.slug)}
                        className="hover:bg-muted mt-8 flex items-center gap-3 rounded-md border p-4"
                    >
                        {product.producer.logo_path && (
                            <img src={`/storage/${product.producer.logo_path}`} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                        )}
                        <div className="min-w-0">
                            <p className="font-serif break-words">{product.producer.name}</p>
                            {product.producer.city && (
                                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                                    <MapPin className="size-3" />
                                    {product.producer.city}
                                </p>
                            )}
                        </div>
                    </Link>
                </div>
            </div>

            {similar.length > 0 && (
                <section className="mt-16">
                    <h2 className="font-serif text-2xl">Slični proizvodi</h2>
                    <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
                        {similar.map((p) => (
                            <Link key={p.id} href={route('marketplace.products.show', p.slug)} className="group">
                                <div className="bg-muted aspect-square overflow-hidden rounded-md">
                                    {p.images?.[0] && (
                                        <img
                                            src={`/storage/${p.images[0].path}`}
                                            alt={p.name}
                                            className="image-warm size-full object-cover transition group-hover:scale-105"
                                        />
                                    )}
                                </div>
                                <p className="mt-2 text-sm font-medium">{p.name}</p>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </MarketplaceLayout>
    );
}
