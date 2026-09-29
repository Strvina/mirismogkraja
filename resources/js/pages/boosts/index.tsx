import InfoHint from '@/components/info-hint';
import PaymentSlipDialog, { type PaymentSlip } from '@/components/marketplace/payment-slip-dialog';
import { HowItWorks, PaymentStatusBadge, type PaymentStatus } from '@/components/marketplace/payment-status';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { BadgeCheck, Check, MousePointerClick, Package, Receipt, Sparkles, Store } from 'lucide-react';
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
    status: PaymentStatus;
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

function daysLeft(endsAt: string): number {
    return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000));
}

/** One of the two things a producer can boost, with its price and where it shows. */
function OptionCard({
    icon: Icon,
    title,
    price,
    days,
    where,
    children,
}: {
    icon: typeof Store;
    title: string;
    price: number;
    days: number;
    where: string[];
    children: React.ReactNode;
}) {
    return (
        <div className="border-border/70 bg-background flex flex-col rounded-2xl border p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <span className="bg-gold/10 text-gold grid size-11 place-items-center rounded-full">
                    <Icon className="size-5" aria-hidden />
                </span>
                <p className="text-right">
                    <span className="font-serif text-3xl">{dinars.format(price)}</span>
                    <span className="text-muted-foreground block text-xs">RSD · {days} dana</span>
                </p>
            </div>
            <h2 className="mt-4 font-serif text-2xl">{title}</h2>
            <ul className="text-muted-foreground mt-3 space-y-1.5 text-sm">
                {where.map((line) => (
                    <li key={line} className="flex gap-2">
                        <Check className="text-olive mt-0.5 size-4 shrink-0" aria-hidden />
                        {line}
                    </li>
                ))}
            </ul>
            <div className="mt-auto pt-5">{children}</div>
        </div>
    );
}

/**
 * A producer's paid boosts (task 20.2). Choosing one hands back a slip
 * straight away, as the membership page does - the payment is the one thing
 * left to do, and a second click is how it gets forgotten.
 */
export default function Boosts({ terms, producers, boosts }: { terms: Terms; producers: ProducerOption[]; boosts: BoostRow[] }) {
    const [producerId, setProducerId] = useState(producers[0]?.id ?? null);
    const producer = producers.find((item) => item.id === producerId) ?? producers[0] ?? null;
    const [productId, setProductId] = useState<string>('');
    const [busy, setBusy] = useState(false);
    const [slipFor, setSlipFor] = useState<number | null>(null);

    const chosenProduct = productId || String(producer?.products[0]?.id ?? '');

    const request = (kind: 'profile' | 'product') => {
        if (!producer) {
            return;
        }

        router.post(
            route('boosts.store'),
            { kind, producer_id: producer.id, product_id: kind === 'product' ? chosenProduct : null },
            {
                preserveScroll: true,
                onStart: () => setBusy(true),
                onFinish: () => setBusy(false),
                // The newest boost is first in the list the page reloads with.
                onSuccess: (page) => setSlipFor((page.props.boosts as BoostRow[])[0]?.id ?? null),
            },
        );
    };

    const shown = boosts.find((boost) => boost.id === slipFor);

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Isticanje" />

            <p className="text-primary mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase">
                <Sparkles className="size-4" aria-hidden />
                Za proizvođače
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl">Isticanje</h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
                Neka kupci prvo vide vas. Istaknuti profili i proizvodi stoje u posebnom, označenom delu iznad liste — pre svih ostalih.
            </p>

            <div className="mt-8">
                <HowItWorks
                    steps={[
                        { icon: MousePointerClick, title: 'Izaberite', text: 'Profil ili jedan od vaših proizvoda.' },
                        { icon: Receipt, title: 'Uplatite', text: 'Uplatnica sa QR kodom se otvara odmah — platite u banci ili aplikaciji.' },
                        { icon: BadgeCheck, title: 'Istaknuti ste', text: `Čim uplata stigne, aktiviramo isticanje na ${terms.days} dana.` },
                    ]}
                />
            </div>

            {!producer ? (
                <p className="text-muted-foreground mt-10 text-sm">
                    Isticanje je dostupno kada je vaš proizvođač odobren.{' '}
                    <Link href={route('producers.index')} className="underline">
                        Moji proizvođači
                    </Link>
                </p>
            ) : (
                <section className="mt-10">
                    {producers.length > 1 && (
                        <label className="mb-5 flex max-w-sm flex-col gap-1.5 text-sm font-medium">
                            Za proizvođača
                            <select
                                className="border-input bg-background h-10 rounded-md border px-3 font-normal"
                                value={producer.id}
                                onChange={(e) => {
                                    setProducerId(Number(e.target.value));
                                    setProductId('');
                                }}
                            >
                                {producers.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}

                    <div className="grid gap-5 md:grid-cols-2">
                        <OptionCard
                            icon={Store}
                            title="Istakni profil"
                            price={terms.profile_price}
                            days={terms.days}
                            where={[
                                'U redu „Istaknuti proizvođači” na vrhu liste proizvođača',
                                'I kada kupci traže proizvođače iz vašeg grada',
                                'Označeno kao „Istaknuto”',
                            ]}
                        >
                            <Button className="w-full" disabled={busy} onClick={() => request('profile')}>
                                Istakni „{producer.name}”
                            </Button>
                        </OptionCard>

                        <OptionCard
                            icon={Package}
                            title="Istakni proizvod"
                            price={terms.product_price}
                            days={terms.days}
                            where={[
                                'U redu „Istaknuti proizvodi” iznad kataloga',
                                'Samo kupcima čiji filteri odgovaraju proizvodu',
                                'Označeno kao „Istaknuto”',
                            ]}
                        >
                            {producer.products.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    Još nemate objavljenih proizvoda.{' '}
                                    <Link href={route('producers.products.create', producer.id)} className="underline">
                                        Dodajte proizvod
                                    </Link>
                                </p>
                            ) : (
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <select
                                        aria-label="Proizvod koji ističete"
                                        className="border-input bg-background h-10 min-w-0 flex-1 rounded-md border px-3 text-sm"
                                        value={chosenProduct}
                                        onChange={(e) => setProductId(e.target.value)}
                                    >
                                        {producer.products.map((product) => (
                                            <option key={product.id} value={product.id}>
                                                {product.name}
                                            </option>
                                        ))}
                                    </select>
                                    <Button disabled={busy || !chosenProduct} onClick={() => request('product')}>
                                        Istakni proizvod
                                    </Button>
                                </div>
                            )}
                        </OptionCard>
                    </div>

                    <p className="text-muted-foreground mt-4 flex items-center gap-1 text-sm">
                        Kako se biraju mesta?
                        <InfoHint label="Kako se biraju istaknuta mesta?" title="Pravedno za sve koji plaćaju">
                            <p>
                                Ako je istaknuto više proizvođača nego što ima mesta, mesta se nasumično smenjuju pri svakoj poseti — niko ne drži vrh
                                stalno.
                            </p>
                            <p>Obična lista ispod ostaje ista za sve; isticanje ne pomera nikoga u njoj.</p>
                            <p>Ako kupite novo isticanje dok je staro aktivno, novo počinje kada se staro završi.</p>
                        </InfoHint>
                    </p>
                </section>
            )}

            {boosts.length > 0 && (
                <section className="mt-12">
                    <h2 className="font-serif text-2xl">Vaša isticanja</h2>
                    <ul className="mt-4 space-y-3">
                        {boosts.map((boost) => (
                            <li
                                key={boost.id}
                                className="border-border/70 bg-background flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                            >
                                <span className="flex min-w-0 items-center gap-3">
                                    <span className="bg-muted grid size-9 shrink-0 place-items-center rounded-full">
                                        {boost.kind === 'product' ? <Package className="size-4" /> : <Store className="size-4" />}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block font-medium break-words">{boost.name}</span>
                                        <span className="text-muted-foreground block text-xs">
                                            {boost.kind === 'product' ? 'Proizvod' : 'Profil'} · {boost.days} dana · {dinars.format(boost.amount_rsd)}{' '}
                                            RSD
                                            {boost.status === 'active' && boost.ends_at && ` · još ${daysLeft(boost.ends_at)} d.`}
                                        </span>
                                    </span>
                                </span>
                                <span className="flex items-center gap-2">
                                    <PaymentStatusBadge status={boost.status} />
                                    {boost.slip && (
                                        <Button variant="outline" size="sm" onClick={() => setSlipFor(boost.id)}>
                                            Uplatnica
                                        </Button>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {shown?.slip && shown.download_url && (
                <PaymentSlipDialog slip={shown.slip} downloadUrl={shown.download_url} open onOpenChange={(open) => !open && setSlipFor(null)} />
            )}
        </MarketplaceLayout>
    );
}
