import PaymentSlipDialog, { type PaymentSlip } from '@/components/marketplace/payment-slip-dialog';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Terms {
    profile_price: number;
    product_price: number;
    days: number;
}

interface BoostRow {
    id: number;
    kind: 'profile' | 'product';
    name: string;
    status: 'pending_payment' | 'active' | 'expired' | 'cancelled';
    amount_rsd: number;
    days: number;
    ends_at: string | null;
    created_at: string;
    slip: PaymentSlip | null;
    download_url: string | null;
}

interface ProducerOption {
    id: number;
    name: string;
    products: { id: number; name: string }[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Isticanje', href: '/isticanje' }];

const dinars = new Intl.NumberFormat('sr-RS');

const statusLabels: Record<BoostRow['status'], string> = {
    pending_payment: 'Čeka uplatu',
    active: 'Aktivno',
    expired: 'Isteklo',
    cancelled: 'Otkazano',
};

function BoostForm({ producer, terms, onRequested }: { producer: ProducerOption; terms: Terms; onRequested: () => void }) {
    const [productId, setProductId] = useState<string>(producer.products[0] ? String(producer.products[0].id) : '');
    const [busy, setBusy] = useState(false);

    const request = (kind: 'profile' | 'product') => {
        router.post(
            route('boosts.store'),
            { kind, producer_id: producer.id, product_id: kind === 'product' ? productId : null },
            {
                preserveScroll: true,
                onStart: () => setBusy(true),
                onFinish: () => setBusy(false),
                onSuccess: onRequested,
            },
        );
    };

    return (
        <div className="border-border/70 rounded-lg border p-5">
            <h2 className="font-serif text-2xl break-words">{producer.name}</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                    <p className="font-medium">Istakni profil</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {dinars.format(terms.profile_price)} RSD · {terms.days} dana u redu „Istaknuti proizvođači”, i u pretrazi po vašem gradu.
                    </p>
                    <Button className="mt-3" size="sm" disabled={busy} onClick={() => request('profile')}>
                        Istakni profil
                    </Button>
                </div>

                <div>
                    <p className="font-medium">Istakni proizvod</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {dinars.format(terms.product_price)} RSD · {terms.days} dana u redu „Istaknuti proizvodi” u katalogu.
                    </p>
                    {producer.products.length === 0 ? (
                        <p className="text-muted-foreground mt-3 text-sm">Nemate objavljenih proizvoda.</p>
                    ) : (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <select
                                aria-label={`Proizvod za isticanje - ${producer.name}`}
                                className="border-input bg-background h-9 min-w-0 flex-1 rounded-md border px-3 text-sm"
                                value={productId}
                                onChange={(e) => setProductId(e.target.value)}
                            >
                                {producer.products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name}
                                    </option>
                                ))}
                            </select>
                            <Button size="sm" disabled={busy || !productId} onClick={() => request('product')}>
                                Istakni proizvod
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * A producer's paid boosts (task 20.2). Choosing one hands back a slip
 * straight away, as the membership page does - the payment is the one thing
 * left to do, and a second click is how it gets forgotten.
 */
export default function Boosts({ terms, producers, boosts }: { terms: Terms; producers: ProducerOption[]; boosts: BoostRow[] }) {
    const [slipFor, setSlipFor] = useState<number | null>(null);
    const [openNewest, setOpenNewest] = useState(false);

    // After a request the page reloads with the new boost first; open its slip.
    const newestPending = boosts.find((boost) => boost.status === 'pending_payment');
    const shown = boosts.find((boost) => boost.id === (openNewest ? newestPending?.id : slipFor));

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Isticanje" />

            <h1 className="font-serif text-4xl sm:text-5xl">Isticanje</h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
                Istaknuti profili i proizvodi stoje u posebnom redu iznad liste, označeni kao „Istaknuto”. Mesta se smenjuju pri svakoj poseti, pa
                niko ne drži vrh stalno — a obična lista ostaje ista za sve. Plaća se uplatnicom; isticanje počinje kad uplata stigne.
            </p>

            {producers.length === 0 ? (
                <p className="text-muted-foreground mt-8 text-sm">
                    Isticanje je dostupno kada je vaš proizvođač odobren.{' '}
                    <Link href={route('producers.index')} className="underline">
                        Moji proizvođači
                    </Link>
                </p>
            ) : (
                <div className="mt-8 space-y-4">
                    {producers.map((producer) => (
                        <BoostForm key={producer.id} producer={producer} terms={terms} onRequested={() => setOpenNewest(true)} />
                    ))}
                </div>
            )}

            {boosts.length > 0 && (
                <section className="mt-12">
                    <h2 className="font-serif text-2xl">Vaša isticanja</h2>
                    <ul className="mt-4 space-y-2">
                        {boosts.map((boost) => (
                            <li
                                key={boost.id}
                                className="border-border/70 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                            >
                                <span className="min-w-0 break-words">
                                    <span className="font-medium">{boost.name}</span>
                                    <span className="text-muted-foreground">
                                        {' '}
                                        · {boost.kind === 'product' ? 'proizvod' : 'profil'} · {boost.days} dana · {dinars.format(boost.amount_rsd)}{' '}
                                        RSD
                                        {boost.status === 'active' && boost.ends_at && ` · do ${new Date(boost.ends_at).toLocaleDateString('sr-RS')}`}
                                    </span>
                                </span>
                                <span className="flex items-center gap-2">
                                    <span className="bg-muted rounded-full px-2 py-0.5 text-xs font-medium">{statusLabels[boost.status]}</span>
                                    {boost.slip && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setOpenNewest(false);
                                                setSlipFor(boost.id);
                                            }}
                                        >
                                            Otvori uplatnicu
                                        </Button>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {shown?.slip && shown.download_url && (
                <PaymentSlipDialog
                    slip={shown.slip}
                    downloadUrl={shown.download_url}
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setSlipFor(null);
                            setOpenNewest(false);
                        }
                    }}
                />
            )}
        </MarketplaceLayout>
    );
}
