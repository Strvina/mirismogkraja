import InputError from '@/components/input-error';
import PaymentSlipDialog, { type PaymentSlip } from '@/components/marketplace/payment-slip-dialog';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
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
    slip: PaymentSlip | null;
    download_url: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Kampanje', href: '/kampanje' }];

const dinars = new Intl.NumberFormat('sr-RS');

const statusLabels: Record<Place['status'], string> = {
    pending_payment: 'Čeka uplatu',
    active: 'Učestvujete',
    cancelled: 'Otkazano',
};

function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('sr-RS', { day: 'numeric', month: 'long' });
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
    const [slipFor, setSlipFor] = useState<number | null>(null);

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
            <Head title="Kampanje" />

            <h1 className="font-serif text-4xl sm:text-5xl">Sezonske kampanje</h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
                Tematske stranice za sezonu — ajvar, zimnica, slava. Dok kampanja traje, najavljena je na početnoj strani, a na njenoj stranici stoje
                proizvođači koji učestvuju.
            </p>

            {producers.length === 0 ? (
                <p className="text-muted-foreground mt-8 text-sm">
                    Kampanje su dostupne kada je vaš proizvođač odobren.{' '}
                    <Link href={route('producers.index')} className="underline">
                        Moji proizvođači
                    </Link>
                </p>
            ) : (
                <>
                    {producers.length > 1 && (
                        <label className="mt-6 flex max-w-sm flex-col gap-1.5 text-sm">
                            Za proizvođača
                            <select
                                className="border-input bg-background h-10 rounded-md border px-3"
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
                    <InputError message={errors.producer_id} className="mt-2" />

                    {campaigns.length === 0 ? (
                        <p className="text-muted-foreground mt-8 text-sm">Trenutno nema otvorenih kampanja.</p>
                    ) : (
                        <div className="mt-8 grid gap-4 md:grid-cols-2">
                            {campaigns.map((campaign) => {
                                const place = placeOf(campaign);

                                return (
                                    <div key={campaign.id} className="border-border/70 flex flex-col rounded-lg border p-5">
                                        <p className="text-primary text-xs font-semibold tracking-[0.12em] uppercase">
                                            {formatDate(campaign.starts_on)} – {formatDate(campaign.ends_on)}
                                        </p>
                                        <h2 className="mt-1 font-serif text-2xl break-words">{campaign.name}</h2>
                                        {campaign.description && (
                                            <p className="text-muted-foreground mt-2 line-clamp-3 text-sm">{campaign.description}</p>
                                        )}
                                        <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                                            <span className="font-serif text-xl">{dinars.format(campaign.price_rsd)} RSD</span>
                                            {place ? (
                                                <span className="bg-muted rounded-full px-2 py-0.5 text-xs font-medium">
                                                    {statusLabels[place.status]}
                                                </span>
                                            ) : (
                                                <Button size="sm" onClick={() => join(campaign)}>
                                                    Prijavi se
                                                </Button>
                                            )}
                                            <Link href={route('campaigns.show', campaign.slug)} className="text-muted-foreground text-sm underline">
                                                Stranica kampanje
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {places.length > 0 && (
                <section className="mt-12">
                    <h2 className="font-serif text-2xl">Vaše prijave</h2>
                    <ul className="mt-4 space-y-2">
                        {places.map((place) => (
                            <li
                                key={place.id}
                                className="border-border/70 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                            >
                                <span className="min-w-0 break-words">
                                    <span className="font-medium">{place.campaign}</span>
                                    <span className="text-muted-foreground">
                                        {' '}
                                        · {place.producer} · {dinars.format(place.amount_rsd)} RSD
                                    </span>
                                </span>
                                <span className="flex items-center gap-2">
                                    <span className="bg-muted rounded-full px-2 py-0.5 text-xs font-medium">{statusLabels[place.status]}</span>
                                    {place.slip && (
                                        <Button variant="outline" size="sm" onClick={() => setSlipFor(place.id)}>
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
                <PaymentSlipDialog slip={shown.slip} downloadUrl={shown.download_url} open onOpenChange={(open) => !open && setSlipFor(null)} />
            )}
        </MarketplaceLayout>
    );
}
