import PaidItemActions, { type PaidItemFields, PaidItemRow } from '@/components/admin/paid-item-actions';
import SettingsPanel from '@/components/admin/settings-panel';
import StatusTabs from '@/components/admin/status-tabs';
import InputError from '@/components/input-error';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatNumber, formatRelativeTime } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface Campaign {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    starts_on: string;
    ends_on: string;
    price_rsd: number;
    is_active: boolean;
    active_count: number;
    pending_count: number;
}

type Tab = 'settings' | 'pending_payment' | 'active' | 'ended' | 'cancelled';

interface Place extends PaidItemFields {
    reference: string;
    created_at: string;
    campaign: { id: number; name: string; slug: string; starts_on: string; ends_on: string } | null;
    producer: { id: number; name: string; slug: string } | null;
}

// A type, not an interface: useForm needs the implicit index signature.
type CampaignForm = {
    name: string;
    description: string;
    starts_on: string;
    ends_on: string;
    price_rsd: number;
    is_active: boolean;
};

const TABS: { status: Exclude<Tab, 'settings'>; label: string }[] = [
    { status: 'pending_payment', label: tx('Čekaju uplatu') },
    { status: 'active', label: tx('U toku') },
    { status: 'ended', label: tx('Završene') },
    { status: 'cancelled', label: tx('Otkazane') },
];

function CampaignFields({ campaign, onDone }: { campaign?: Campaign; onDone?: () => void }) {
    const { data, setData, post, put, processing, errors, reset } = useForm<CampaignForm>({
        name: campaign?.name ?? '',
        description: campaign?.description ?? '',
        starts_on: campaign?.starts_on ?? '',
        ends_on: campaign?.ends_on ?? '',
        price_rsd: campaign?.price_rsd ?? 1990,
        is_active: campaign?.is_active ?? false,
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                if (!campaign) {
                    reset();
                }
                onDone?.();
            },
        };

        if (campaign) {
            put(route('admin.campaigns.update', campaign.id), options);
        } else {
            post(route('admin.campaigns.store'), options);
        }
    };

    const id = (field: string) => `campaign-${campaign?.id ?? 'new'}-${field}`;

    return (
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor={id('name')}>{t('Naziv')}</Label>
                <Input id={id('name')} value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder={t('Ajvar sezona')} />
                <InputError message={errors.name} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor={id('description')}>{t('Opis')}</Label>
                <textarea
                    id={id('description')}
                    rows={3}
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                />
                <InputError message={errors.description} />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor={id('starts')}>{t('Počinje')}</Label>
                <Input id={id('starts')} type="date" value={data.starts_on} onChange={(e) => setData('starts_on', e.target.value)} />
                <InputError message={errors.starts_on} />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor={id('ends')}>{t('Završava se')}</Label>
                <Input id={id('ends')} type="date" value={data.ends_on} onChange={(e) => setData('ends_on', e.target.value)} />
                <InputError message={errors.ends_on} />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor={id('price')}>{t('Cena učešća (RSD)')}</Label>
                <Input id={id('price')} type="number" min={0} value={data.price_rsd} onChange={(e) => setData('price_rsd', Number(e.target.value))} />
                <InputError message={errors.price_rsd} />
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                {t('Objavljena (vidljiva proizvođačima i na sajtu)')}
            </label>
            <div className="sm:col-span-2">
                <Button disabled={processing}>{campaign ? t('Sačuvaj izmene') : t('Napravi kampanju')}</Button>
            </div>
        </form>
    );
}

/**
 * Seasonal campaigns (task 20.3): making and editing them on the first tab,
 * the producers who paid to join, by status, on the others.
 */
export default function AdminCampaigns({
    campaigns,
    places,
    filters,
    counts,
}: {
    campaigns: Paginated<Campaign> | null;
    places: Paginated<Place> | null;
    filters: { status: Tab };
    counts: Record<string, number>;
}) {
    const [editing, setEditing] = useState<number | null>(null);

    const confirm = (place: Place) => router.patch(route('admin.campaigns.confirm', place.id), {}, { preserveScroll: true });

    return (
        <AdminLayout title={t('Kampanje')}>
            <Head title={t('Kampanje')} />

            <StatusTabs routeName="admin.campaigns.index" current={filters.status} settingsLabel={tx('Kampanje')} tabs={TABS} counts={counts} />

            {campaigns && (
                <div className="mt-6 max-w-3xl space-y-3">
                    <SettingsPanel title={t('Nova kampanja')} summary={t('Tematska stranica za jednu sezonu — ajvar, zimnica, slava…')}>
                        <CampaignFields />
                    </SettingsPanel>

                    {campaigns.data.length === 0 ? (
                        <p className="text-muted-foreground pt-3 text-sm">{t('Još nema kampanja.')}</p>
                    ) : (
                        campaigns.data.map((campaign) => (
                            <div key={campaign.id} className="bg-background rounded-xl border p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-medium break-words">
                                            {campaign.name}{' '}
                                            {!campaign.is_active && (
                                                <span className="text-muted-foreground text-xs font-normal">{t('(nije objavljena)')}</span>
                                            )}
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-sm">
                                            {formatDate(campaign.starts_on)} – {formatDate(campaign.ends_on)} · {formatNumber(campaign.price_rsd)} RSD
                                            ·{' '}
                                            {t('učestvuje :active, čeka :pending', {
                                                active: campaign.active_count,
                                                pending: campaign.pending_count,
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {campaign.is_active && (
                                            <Button asChild variant="ghost" size="sm">
                                                <Link href={route('campaigns.show', campaign.slug)}>{t('Stranica')}</Link>
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" onClick={() => setEditing(editing === campaign.id ? null : campaign.id)}>
                                            {editing === campaign.id ? t('Zatvori') : t('Izmeni')}
                                        </Button>
                                    </div>
                                </div>
                                {editing === campaign.id && (
                                    <div className="border-border/70 mt-4 border-t pt-4">
                                        <CampaignFields campaign={campaign} onDone={() => setEditing(null)} />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    <Pagination meta={campaigns} />
                </div>
            )}

            {places &&
                (places.data.length === 0 ? (
                    <p className="text-muted-foreground mt-6 text-sm">{t('Ovde nema ničega.')}</p>
                ) : (
                    <div className="mt-6 space-y-3">
                        {places.data.map((place) => (
                            <PaidItemRow
                                key={place.id}
                                item={place}
                                title={place.producer?.name ?? t('Obrisan proizvođač')}
                                subtitle={place.campaign?.name}
                                facts={[
                                    <>
                                        {t('Poziv na broj')} <span className="text-foreground font-medium">{place.reference}</span>
                                    </>,
                                    <span className="text-foreground font-medium">{formatNumber(place.amount_rsd)} RSD</span>,
                                    t('zatraženo :when', { when: formatRelativeTime(place.created_at) }),
                                    ...(place.campaign ? [`${formatDate(place.campaign.starts_on)} – ${formatDate(place.campaign.ends_on)}`] : []),
                                ]}
                                actions={
                                    filters.status !== 'ended' && (
                                        <PaidItemActions
                                            item={place}
                                            what={t('učešće „:name” u kampanji', { name: place.producer?.name ?? '' })}
                                            onConfirm={() => confirm(place)}
                                        />
                                    )
                                }
                            />
                        ))}
                    </div>
                ))}

            {places && <Pagination meta={places} />}
        </AdminLayout>
    );
}
