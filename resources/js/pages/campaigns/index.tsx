import heroImage from '@/assets/hero-ajvar.jpg';
import InputError from '@/components/input-error';
import PaymentSlipDialog, { type PaymentSlip } from '@/components/marketplace/payment-slip-dialog';
import { CancelRequest, HowItWorks, linkedSlipId, PaymentStatusBadge, type RefundState, RefundStatus } from '@/components/marketplace/payment-status';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { formatDate, formatNumber } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { CalendarHeart, Check, Megaphone, MousePointerClick, Receipt } from 'lucide-react';
import { useState } from 'react';

interface Campaign {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    starts_on: string;
    ends_on: string;
    price_rsd: number;
}

interface Place {
    id: number;
    campaign_id: number;
    household_id: number;
    campaign: string;
    producer: string;
    status: 'pending_payment' | 'active' | 'cancelled';
    amount_rsd: number;
    cancel_requested_at: string | null;
    refund: RefundState | null;
    slip: PaymentSlip | null;
    download_url: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: tx('Kampanje'), href: '/kampanje' }];

/** "12. oktobar" / "12 October" / "12 октября". */
function longDay(date: string): string {
    return formatDate(date, { day: 'numeric', month: 'long' });
}

/** "U toku" or "Počinje za 5 dana" - when it is matters as much as what it is. */
function timing(campaign: Campaign): string {
    const today = new Date(new Date().toDateString()).getTime();
    const start = new Date(campaign.starts_on).getTime();
    const end = new Date(campaign.ends_on).getTime();

    if (start <= today) {
        const left = Math.round((end - today) / 86_400_000);
        return left === 0 ? t('U toku · poslednji dan') : t('U toku · još :count d.', { count: left });
    }

    const until = Math.round((start - today) / 86_400_000);
    return until === 1 ? t('Počinje sutra') : t('Počinje za :count dana', { count: until });
}

/**
 * Seasonal campaigns a producer can join (task 20.3). Joining hands back a
 * slip straight away, as memberships and boosts do.
 */
export default function Campaigns({
    campaigns,
    producers,
    places,
}: {
    campaigns: Campaign[];
    producers: { id: number; name: string }[];
    places: Place[];
}) {
    const errors = usePage<{ errors: Record<string, string> }>().props.errors;
    const [producerId, setProducerId] = useState(producers[0] ? String(producers[0].id) : '');
    const [slipFor, setSlipFor] = useState<number | null>(linkedSlipId);

    const placeOf = (campaign: Campaign) =>
        places.find((place) => place.campaign_id === campaign.id && String(place.household_id) === producerId && place.status !== 'cancelled');

    const join = (campaign: Campaign) => {
        router.post(
            route('campaigns.join', campaign.id),
            { producer_id: producerId },
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    // Open the slip for the place just asked for.
                    const fresh = (page.props.places as Place[]).find(
                        (place) => place.campaign_id === campaign.id && String(place.household_id) === producerId,
                    );
                    setSlipFor(fresh?.id ?? null);
                },
            },
        );
    };

    const shown = places.find((place) => place.id === slipFor);

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Kampanje')} />

            <p className="text-primary mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase">
                <CalendarHeart className="size-4" aria-hidden />
                {t('Za proizvođače')}
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl">{t('Sezonske kampanje')}</h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
                {t(
                    'Kampanja je tematska stranica za jednu sezonu — ajvar, zimnica, slava, Uskrs. Dok traje, najavljujemo je na vrhu početne strane, a na njenoj stranici su samo proizvođači koji učestvuju. Kupci koji tada traže baš to — nalaze vas.',
                )}
            </p>

            <div className="mt-8">
                <HowItWorks
                    steps={[
                        { icon: MousePointerClick, title: t('Prijavite se'), text: t('Izaberite kampanju koja odgovara onome što pravite.') },
                        { icon: Receipt, title: t('Uplatite'), text: t('Uplatnica sa QR kodom se otvara odmah.') },
                        { icon: Megaphone, title: t('Učestvujete'), text: t('Čim uplata stigne, vaš profil je na stranici kampanje dok ona traje.') },
                    ]}
                />
            </div>

            {producers.length === 0 ? (
                <p className="text-muted-foreground mt-10 text-sm">
                    Kampanje su dostupne kada je vaš proizvođač odobren.{' '}
                    <Link href={route('producers.index')} className="underline">
                        {t('Moji proizvođači')}
                    </Link>
                </p>
            ) : (
                <section className="mt-10">
                    {producers.length > 1 && (
                        <label className="mb-5 flex max-w-sm flex-col gap-1.5 text-sm font-medium">
                            {t('Za proizvođača')}
                            <select
                                className="border-input bg-background h-10 rounded-md border px-3 font-normal"
                                value={producerId}
                                onChange={(e) => setProducerId(e.target.value)}
                            >
                                {producers.map((producer) => (
                                    <option key={producer.id} value={producer.id}>
                                        {producer.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    <InputError message={errors.producer_id} className="mb-4" />

                    {campaigns.length === 0 ? (
                        <div className="border-border/70 rounded-2xl border border-dashed p-8 text-center">
                            <CalendarHeart className="text-muted-foreground mx-auto size-8" aria-hidden />
                            <p className="mt-3 font-medium">{t('Trenutno nema otvorenih kampanja')}</p>
                            <p className="text-muted-foreground mt-1 text-sm">{t('Obavestićemo vas kada otvorimo novu — obično pred sezonu.')}</p>
                        </div>
                    ) : (
                        <div className="grid gap-5 md:grid-cols-2">
                            {campaigns.map((campaign) => {
                                const place = placeOf(campaign);

                                return (
                                    <article
                                        key={campaign.id}
                                        className="border-border/70 bg-background flex flex-col overflow-hidden rounded-2xl border"
                                    >
                                        {/* The season's photograph under the name, like the
                                            campaign's own page - calm, not a red block. */}
                                        <div className="bg-charcoal relative isolate overflow-hidden px-5 py-5 text-white">
                                            <img
                                                src={heroImage}
                                                alt=""
                                                loading="lazy"
                                                className="image-warm absolute inset-0 -z-10 size-full object-cover object-[70%_60%] opacity-60"
                                            />
                                            <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--charcoal)_88%,transparent),color-mix(in_oklab,var(--charcoal)_45%,transparent))]" />
                                            <p className="text-gold text-xs font-semibold tracking-[0.14em] uppercase">{timing(campaign)}</p>
                                            <h2 className="mt-1 font-serif text-2xl break-words">{campaign.name}</h2>
                                            <p className="mt-1 text-sm text-white/80">
                                                {longDay(campaign.starts_on)} – {longDay(campaign.ends_on)}
                                            </p>
                                        </div>
                                        <div className="flex flex-1 flex-col p-5">
                                            {campaign.description && (
                                                <p className="text-muted-foreground text-sm leading-6">{campaign.description}</p>
                                            )}
                                            <ul className="text-muted-foreground mt-3 space-y-1.5 text-sm">
                                                {[t('Vaš profil na stranici kampanje'), t('Najava na vrhu početne strane dok traje')].map((line) => (
                                                    <li key={line} className="flex gap-2">
                                                        <Check className="text-olive mt-0.5 size-4 shrink-0" aria-hidden />
                                                        {line}
                                                    </li>
                                                ))}
                                            </ul>
                                            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                                                <span>
                                                    <span className="font-serif text-2xl">{formatNumber(campaign.price_rsd)}</span>
                                                    <span className="text-muted-foreground text-xs"> {t('RSD, jednom')}</span>
                                                </span>
                                                {place ? (
                                                    <span className="flex items-center gap-2">
                                                        <PaymentStatusBadge
                                                            status={place.status}
                                                            label={place.status === 'active' ? t('Učestvujete') : undefined}
                                                        />
                                                        {place.slip && (
                                                            <Button variant="outline" size="sm" onClick={() => setSlipFor(place.id)}>
                                                                {t('Uplatnica')}
                                                            </Button>
                                                        )}
                                                    </span>
                                                ) : (
                                                    <Button onClick={() => join(campaign)}>{t('Prijavi se')}</Button>
                                                )}
                                            </div>
                                            <Link
                                                href={route('campaigns.show', campaign.slug)}
                                                className="text-muted-foreground mt-3 text-xs underline"
                                            >
                                                {t('Pogledaj stranicu kampanje')}
                                            </Link>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {places.length > 0 && (
                <section className="mt-12">
                    <h2 className="font-serif text-2xl">{t('Vaše prijave')}</h2>
                    <ul className="mt-4 space-y-3">
                        {places.map((place) => (
                            <li
                                key={place.id}
                                id={`kampanja-${place.id}`}
                                className="border-border/70 bg-background target:ring-gold/60 flex scroll-mt-24 flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm target:ring-2"
                            >
                                <span className="min-w-0 break-words">
                                    <span className="font-medium">{place.campaign}</span>
                                    <span className="text-muted-foreground block text-xs">
                                        {place.producer} · {formatNumber(place.amount_rsd)} RSD
                                    </span>
                                </span>
                                <span className="flex items-center gap-2">
                                    {place.status === 'active' && (
                                        <CancelRequest
                                            kind="kampanja"
                                            id={place.id}
                                            requestedAt={place.cancel_requested_at}
                                            what={t('učešće u kampanji „:name”', { name: place.campaign })}
                                        />
                                    )}
                                    <PaymentStatusBadge status={place.status} label={place.status === 'active' ? 'Učestvujete' : undefined} />
                                    {place.slip && (
                                        <Button variant="outline" size="sm" onClick={() => setSlipFor(place.id)}>
                                            {t('Uplatnica')}
                                        </Button>
                                    )}
                                </span>
                                {place.refund && (
                                    <div className="basis-full">
                                        <RefundStatus kind="kampanja" id={place.id} refund={place.refund} />
                                    </div>
                                )}
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
